-- Create employee_organization_access table for multi-organization access
-- This allows employees to have access to multiple organizations beyond their primary one

CREATE TABLE employee_organization_access (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES hospital_or_mso(id) ON DELETE CASCADE,
  access_level TEXT NOT NULL DEFAULT 'read' CHECK (access_level IN ('read', 'write', 'admin')),
  granted_by UUID REFERENCES employee(id) ON DELETE SET NULL,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Prevent duplicate access records
  UNIQUE(employee_id, organization_id)
);

-- Create indexes for better performance
CREATE INDEX idx_employee_organization_access_employee_id ON employee_organization_access(employee_id);
CREATE INDEX idx_employee_organization_access_organization_id ON employee_organization_access(organization_id);
CREATE INDEX idx_employee_organization_access_active ON employee_organization_access(is_active);

-- Enable RLS
ALTER TABLE employee_organization_access ENABLE ROW LEVEL SECURITY;

-- RLS Policies for employee_organization_access
-- Super admins and admins can manage all access records
CREATE POLICY "Super admins and admins can manage organization access" ON employee_organization_access
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employee
      WHERE employee.auth_user_id = auth.uid()
      AND employee.role IN ('super_admin', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employee
      WHERE employee.auth_user_id = auth.uid()
      AND employee.role IN ('super_admin', 'admin')
    )
  );

-- Users can view their own organization access
CREATE POLICY "Users can view their own organization access" ON employee_organization_access
  FOR SELECT
  TO authenticated
  USING (
    employee_id = (
      SELECT id FROM employee WHERE auth_user_id = auth.uid()
    )
  );

-- Create function to get all accessible organizations for a user
CREATE OR REPLACE FUNCTION get_user_accessible_organizations(user_auth_id UUID)
RETURNS TABLE (
  organization_id UUID,
  organization_name TEXT,
  organization_type TEXT,
  access_level TEXT,
  is_primary BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    h.id as organization_id,
    h.name as organization_name,
    h.type as organization_type,
    COALESCE(eoa.access_level, 'admin') as access_level,
    (h.id = e.hospital_id) as is_primary
  FROM employee e
  LEFT JOIN hospital_or_mso h ON h.id = e.hospital_id
  LEFT JOIN employee_organization_access eoa ON eoa.employee_id = e.id AND eoa.organization_id = h.id
  WHERE e.auth_user_id = user_auth_id

  UNION

  SELECT
    h.id as organization_id,
    h.name as organization_name,
    h.type as organization_type,
    eoa.access_level,
    false as is_primary
  FROM employee e
  JOIN employee_organization_access eoa ON eoa.employee_id = e.id
  JOIN hospital_or_mso h ON h.id = eoa.organization_id
  WHERE e.auth_user_id = user_auth_id
    AND eoa.is_active = true
    AND (eoa.expires_at IS NULL OR eoa.expires_at > NOW())
    AND h.id != e.hospital_id; -- Exclude primary organization to avoid duplicates
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user has access to specific organization
CREATE OR REPLACE FUNCTION user_has_organization_access(user_auth_id UUID, org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM get_user_accessible_organizations(user_auth_id)
    WHERE organization_id = org_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_employee_organization_access_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_employee_organization_access_updated_at
  BEFORE UPDATE ON employee_organization_access
  FOR EACH ROW
  EXECUTE FUNCTION update_employee_organization_access_updated_at();