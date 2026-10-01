/*
  Migration: them cot "images" vao bang Messages de ho tro gui nhieu anh trong mot tin nhan
  (giong ChatGPT). Cot nay CHI THEM MOI, khong dong cham gi den du lieu/cot hien co
  (imageBase64, imageMimeType van duoc giu nguyen de tuong thich nguoc).

  Chay 1 lan tren database hien tai (an toan chay lai nhieu lan nho kiem tra IF NOT EXISTS):
    sqlcmd -S <server> -d <database> -i migration_add_images_column.sql
  hoac copy noi dung nay chay truc tiep trong SSMS / Azure Data Studio.
*/

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.Messages') AND name = 'images'
)
BEGIN
    ALTER TABLE dbo.Messages ADD images NVARCHAR(MAX) NULL;
    PRINT 'Da them cot Messages.images.';
END
ELSE
BEGIN
    PRINT 'Cot Messages.images da ton tai, bo qua.';
END
GO
