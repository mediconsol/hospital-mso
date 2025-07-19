-- Create storage bucket for files
INSERT INTO storage.buckets (id, name, public)
VALUES ('files', 'files', true);

-- Create policy for authenticated users to upload files
CREATE POLICY "Authenticated users can upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'files');

-- Create policy for authenticated users to view files
CREATE POLICY "Authenticated users can view files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'files');

-- Create policy for file owners to delete their files
CREATE POLICY "File owners can delete their files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create policy for authenticated users to update file metadata
CREATE POLICY "Authenticated users can update file metadata"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'files');

-- Update RLS policies for file table
CREATE POLICY "Users can view files in their organization"
ON file FOR SELECT
TO authenticated
USING (
  hospital_id IN (
    SELECT hospital_id FROM employee WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can insert files in their organization"
ON file FOR INSERT
TO authenticated
WITH CHECK (
  hospital_id IN (
    SELECT hospital_id FROM employee WHERE id = auth.uid()
  )
);

CREATE POLICY "File owners can update their files"
ON file FOR UPDATE
TO authenticated
USING (owner_id = auth.uid());

CREATE POLICY "File owners can delete their files"
ON file FOR DELETE
TO authenticated
USING (owner_id = auth.uid());