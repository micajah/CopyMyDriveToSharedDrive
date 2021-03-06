# Copy My Drive Files and Folders To a Shared Drive / Google Team Drive
Script to iterate through Google Drive My Drive Folders and Files looking for files you own that can be moved to a Shared Drive / Team Drive. If you do not own the files it can attempt to copy them and rename/delete them in the source folder.

## Be Prepared to Run this Script Over and Over
You must run this script as each user who is an Owner of a file in the My Drive folder structure. The script will not delete a folder until all the files are cleared out AND you are the owner of the folder. So you may be the owner of a folder, with files inside, owned by someone else plus you.  Step 1 you run the script and your files are moved. Step 2 the other person runs the script, their files are moved. Step 3 you run the script again, now the folder is empty and you own it, the script will delete the folder.

## Time Out
The script uses the Google DriveApp Folder Iterator and File Iterator to resume processing for large folder tree structures.   

## Collect Emails Mode - Do This First
Set the Mode = collect to have the script iterate all files and folders looking for email addresses of the owners. This will allow you to determine who you can still contact to help with the file migration and who you cannot contact. If you cannot contact, you can add these emails to the variable "emailsToAlwaysCopy" as a csv.  In this case the script will not skip these files and instead go ahead and make a copy , regardless of the mode = move or copy..   If the mode is copy it will go ahead and copy them, if the mode is move, it will rename the files with the prefix "deleted-copied" and move the files to the Delete Target Folder for analysis.

## emailsToAlwaysCopy
This is a csv list of email addresses, likely discovered, when you run the script first in mode="collect".  After you determine which users you can contact to run the script from their google account and which ones you cannot, you can add the ones you cannot to this variable emailsToAlwaysCopy.  In this case it will not skip these files and it will copy them to the Team Drive, rename the files with a Suffix and the file path, and move them to the DeleteFolder you set using the DeletedFolderID variable.

## ProcessFiles Function
This is the main entry point to the script. If you are running from Apps Scripts Console and Editor you need to run this function "ProcessFiles"

## Delete Iterator Keys
deleteIteratorKeys() function, I would run this if the system crashes before it stores the iterator keys properly or you want to fully start from the begining again.

## Stackoverflow Thread
It was based on this post https://stackoverflow.com/questions/45689629/how-to-use-continuationtoken-with-recursive-folder-iterator

## Code is Attached to a Google Drive Document
This script is not stand alone google Apps Script Code.  It probably needs to be fixed to be a stand along Google Apps Script file instead of linked to a document, I never got around to it.  It uses PropertiesService.getDocumentProperties().getProperty to store some settings between each script run.  This probably could be changed to getUserProperties().   We just did not have time to worry about it and I'm amazed we even got this working or posted to GitHub.

https://docs.google.com/document/d/1cxS8ig2gsVw6FqBaLGl-wB8TRUQOwaELVaUwyLOk3_g/edit?usp=sharing


