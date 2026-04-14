-- ============================================================
-- RTCIT RECRUITMENT PORTAL — SUPABASE SCHEMA
-- Run this in Supabase SQL Editor (supabase.com → SQL Editor)
-- ============================================================

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text,
  full_name   text,
  role        text DEFAULT 'viewer' CHECK (role IN ('admin','hr_manager','recruiter','viewer')),
  avatar_url  text,
  last_login  timestamptz,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "profiles_update_self" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "profiles_admin_write" ON profiles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS settings (
  key        text PRIMARY KEY,
  value      text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settings_select" ON settings
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "settings_admin_write" ON settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

INSERT INTO settings (key, value) VALUES
  ('institute_name',    'RTCIT'),
  ('institute_tagline', 'Regional Technical College of Information Technology'),
  ('contact_email',     'recruitment@rtcit.edu.in'),
  ('portal_title',      'RTCIT Recruitment Portal'),
  ('ai_enabled',        'false'),
  ('email_enabled',     'false')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- DEPARTMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS departments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  description text,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "departments_public_read" ON departments FOR SELECT USING (true);
CREATE POLICY "departments_auth_write"  ON departments FOR ALL USING (auth.role() = 'authenticated');

INSERT INTO departments (name, description) VALUES
  ('Computer Science',       'CS and software engineering roles'),
  ('Electronics',            'Electronics and communication engineering'),
  ('Mechanical',             'Mechanical and manufacturing engineering'),
  ('Administration',         'Administrative and management roles'),
  ('Teaching Faculty',       'Faculty and teaching positions'),
  ('Research & Development', 'Research and development roles')
ON CONFLICT DO NOTHING;

-- ============================================================
-- JOB POSTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS job_postings (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title          text NOT NULL,
  department_id  uuid REFERENCES departments(id) ON DELETE SET NULL,
  type           text DEFAULT 'full-time'
    CHECK (type IN ('full-time','part-time','contract','internship')),
  location       text DEFAULT 'On-site',
  description    text NOT NULL,
  requirements   text,
  qualifications text,
  salary_min     integer,
  salary_max     integer,
  deadline       date,
  status         text DEFAULT 'draft'
    CHECK (status IN ('draft','active','paused','closed')),
  created_by     uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

ALTER TABLE job_postings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "jobs_public_read" ON job_postings
  FOR SELECT USING (status = 'active' OR auth.role() = 'authenticated');

CREATE POLICY "jobs_hr_write" ON job_postings
  FOR ALL USING (
    auth.role() = 'authenticated' AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','hr_manager','recruiter'))
  );

CREATE INDEX IF NOT EXISTS idx_job_postings_status     ON job_postings (status);
CREATE INDEX IF NOT EXISTS idx_job_postings_department ON job_postings (department_id);
CREATE INDEX IF NOT EXISTS idx_job_postings_created    ON job_postings (created_at DESC);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS job_postings_updated_at ON job_postings;
CREATE TRIGGER job_postings_updated_at
  BEFORE UPDATE ON job_postings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- APPLICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS applications (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id           uuid REFERENCES job_postings(id) ON DELETE CASCADE,

  full_name        text NOT NULL,
  email            text NOT NULL,
  phone            text,
  cover_letter     text,
  resume_url       text,
  resume_filename  text,
  linkedin_url     text,
  portfolio_url    text,

  experience_years integer DEFAULT 0,
  current_company  text,
  current_role_title text,
  expected_salary  text,
  notice_period    text,

  stage text DEFAULT 'applied'
    CHECK (stage IN ('applied','screening','shortlisted','interview','offer','hired','rejected','withdrawn')),

  ai_score        integer CHECK (ai_score BETWEEN 0 AND 100),
  ai_summary      text,
  ai_breakdown    jsonb,
  ai_evaluated_at timestamptz,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "applications_public_insert" ON applications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "applications_auth_read" ON applications
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "applications_hr_update" ON applications
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','hr_manager','recruiter'))
  );

CREATE POLICY "applications_admin_delete" ON applications
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE INDEX IF NOT EXISTS idx_applications_job     ON applications (job_id);
CREATE INDEX IF NOT EXISTS idx_applications_stage   ON applications (stage);
CREATE INDEX IF NOT EXISTS idx_applications_email   ON applications (email);
CREATE INDEX IF NOT EXISTS idx_applications_created ON applications (created_at DESC);

DROP TRIGGER IF EXISTS applications_updated_at ON applications;
CREATE TRIGGER applications_updated_at
  BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- STAGE HISTORY
-- ============================================================
CREATE TABLE IF NOT EXISTS stage_history (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid REFERENCES applications(id) ON DELETE CASCADE,
  from_stage     text,
  to_stage       text NOT NULL,
  changed_by     uuid REFERENCES profiles(id) ON DELETE SET NULL,
  notes          text,
  created_at     timestamptz DEFAULT now()
);

ALTER TABLE stage_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stage_history_read"   ON stage_history FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "stage_history_insert" ON stage_history FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS idx_stage_history_app ON stage_history (application_id);

-- ============================================================
-- APPLICATION NOTES
-- ============================================================
CREATE TABLE IF NOT EXISTS application_notes (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid REFERENCES applications(id) ON DELETE CASCADE,
  note           text NOT NULL,
  created_by     uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

ALTER TABLE application_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notes_read"       ON application_notes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "notes_insert"     ON application_notes FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "notes_update_own" ON application_notes FOR UPDATE USING (created_by = auth.uid());
CREATE POLICY "notes_delete"     ON application_notes FOR DELETE USING (
  created_by = auth.uid() OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP TRIGGER IF EXISTS notes_updated_at ON application_notes;
CREATE TRIGGER notes_updated_at
  BEFORE UPDATE ON application_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- EMAIL TEMPLATES
-- ============================================================
CREATE TABLE IF NOT EXISTS email_templates (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  subject    text NOT NULL,
  body       text NOT NULL,
  type       text CHECK (type IN ('confirm','screen','interview','offer','reject')),
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "templates_read"  ON email_templates FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "templates_write" ON email_templates FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','hr_manager'))
);

INSERT INTO email_templates (name, subject, body, type) VALUES
(
  'Application Received',
  'Your Application for {{job_title}} at RTCIT',
  E'Dear {{candidate_name}},\n\nThank you for applying for the position of {{job_title}} at RTCIT. We have received your application and will be in touch within 7–10 working days.\n\nBest regards,\nRTCIT Recruitment Team',
  'confirm'
),
(
  'Shortlisted for Screening',
  'Good News! Shortlisted — {{job_title}} at RTCIT',
  E'Dear {{candidate_name}},\n\nWe are pleased to inform you that you have been shortlisted for the {{job_title}} position. We would like to schedule a screening call — please reply with your availability.\n\nBest regards,\nRTCIT Recruitment Team',
  'screen'
),
(
  'Interview Invitation',
  'Interview Invitation — {{job_title}} at RTCIT',
  E'Dear {{candidate_name}},\n\nWe are delighted to invite you for an interview for the {{job_title}} position at RTCIT. Please reply to confirm your availability.\n\nBest regards,\nRTCIT Recruitment Team',
  'interview'
),
(
  'Job Offer',
  'Job Offer — {{job_title}} at RTCIT',
  E'Dear {{candidate_name}},\n\nWe are delighted to extend an offer for the {{job_title}} position at RTCIT. Please confirm acceptance within 5 working days.\n\nBest regards,\nRTCIT Recruitment Team',
  'offer'
),
(
  'Application Unsuccessful',
  'Update on Your Application — {{job_title}} at RTCIT',
  E'Dear {{candidate_name}},\n\nThank you for your interest in the {{job_title}} position. After careful consideration, we will not be proceeding with your application at this time. We wish you all the best.\n\nBest regards,\nRTCIT Recruitment Team',
  'reject'
)
ON CONFLICT DO NOTHING;

-- ============================================================
-- EMAILS SENT
-- ============================================================
CREATE TABLE IF NOT EXISTS emails_sent (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid REFERENCES applications(id) ON DELETE CASCADE,
  to_email       text NOT NULL,
  to_name        text,
  subject        text NOT NULL,
  body           text NOT NULL,
  template_id    uuid REFERENCES email_templates(id) ON DELETE SET NULL,
  sent_by        uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status         text DEFAULT 'sent' CHECK (status IN ('sent','delivered','failed')),
  sent_at        timestamptz DEFAULT now()
);

ALTER TABLE emails_sent ENABLE ROW LEVEL SECURITY;

CREATE POLICY "emails_sent_read"   ON emails_sent FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "emails_sent_insert" ON emails_sent FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS idx_emails_sent_app ON emails_sent (application_id);
CREATE INDEX IF NOT EXISTS idx_emails_sent_at  ON emails_sent (sent_at DESC);

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id          bigserial PRIMARY KEY,
  user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name   text,
  action      text NOT NULL,
  table_name  text,
  record_id   text,
  old_values  jsonb,
  new_values  jsonb,
  description text,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_read"   ON audit_logs FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "audit_insert" ON audit_logs FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_audit_user    ON audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_table   ON audit_logs (table_name);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action  ON audit_logs (action);

-- ============================================================
-- STORAGE: Create bucket in Dashboard > Storage
-- Bucket name: resumes, Public: false, Max size: 10MB
-- Allowed types: application/pdf, application/msword,
--   application/vnd.openxmlformats-officedocument.wordprocessingml.document
--
-- Storage RLS policies (Dashboard > Storage > Policies):
--   SELECT: bucket_id = 'resumes' AND auth.role() = 'authenticated'
--   INSERT: bucket_id = 'resumes'  (allow all for candidate uploads)
-- ============================================================
