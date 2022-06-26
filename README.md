# Copy My Drive Files and Folders To a Shared Drive / Google Team Drive
Script to iterate through Google Drive My Drive Folders and Files looking for files you own that can be moved to a Shared Drive / Team Drive. If you do not own the files it can attempt to copy them and rename/delete them in the source folder.

## Collect Emails Mode
Set the Mode = collect to have the script iterate all files and folders looking for email addresses of the owners. This will allow you to determine who you can still contact to help with the file migration and who you cannot contact. If you cannot contact, you can add these emails to the variable "emailsToAlwaysCopy" as a csv.  In this case the script will not skip these files and instead go ahead and make a copy , regardless of the mode = move or copy..   If the mode is copy it will go ahead and copy them, if the mode is move, it will rename the files with the prefix "deleted-copied" and move the files to the Delete Target Folder for analysis. 

