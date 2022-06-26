//Values to Set or Consider
var sourceFolderId = ""
var targetFolderId = ""
var deletedFolderId = "" //Folder for non-owned files to move them,  Cannot be below the source folder or you will have problems.  Must be at the same hierarchical level as the source or above it, do not put it below.
var copyTheSourceFolder = false;  //do you want it to actually move the source folder as a sub folder into the target
var emailsToAlwaysCopy = "email1@gmail.com,email2@gmail.com" //csv of emails that you cannot move and want to make a copy and delete
var mode = "collect" // move | copy | collect 

//Values to Ignore
var MAX_RUNNING_TIME_MS = 4 * 60 * 1000; //I would not set higher than 4 for 4 minutes.  Scripts timeout at 6 minutes and you should not allow it to timeout without storing the keys.
var RECURSIVE_ITERATOR_KEY = "RECURSIVE_ITERATOR_KEY";
var STORED_EMAILS_KEY = "STORED_EMAILS_KEY";
var debug = false;

var currentUserEmail;
var emailList = [];

function ProcessFiles(){
  if(debug){console.warn("Debug = ON DEBUG DEBUG")}else{console.log("Debug = Off")};
  if(mode=="copy"){console.log("Mode = Copy (not Move)")}
    else if(mode=="collect"){console.log("Collecting Emails Only (no move or copy)")}
    else{console.warn("Mode = MOVE")};
  console.log("Source Folder : " + DriveApp.getFolderById(sourceFolderId).getName());
  console.log("Target Folder : " + DriveApp.getFolderById(targetFolderId).getName());

  currentUserEmail = Session.getActiveUser().getEmail();

  console.log("Current User's Email : " + currentUserEmail);

  //Covert the list of Emails Always to Copy to an Array
  //Add as editors to the Deleted Folder
  if(emailsToAlwaysCopy == undefined || emailsToAlwaysCopy == ""){
    emailsToAlwaysCopy = null;
  }else{
    emailsToCopyArray = emailsToAlwaysCopy.split(',');
    DriveApp.getFolderById(deletedFolderId).addEditors(emailsToCopyArray);
  }

  var currentFolder = DriveApp.getFolderById(sourceFolderId);
  processRootFolder(currentFolder);

}

function processRootFolder(rootFolder) {

  var startTime = (new Date()).getTime();

  if(mode=="collect"){
    emailList = JSON.parse(PropertiesService.getDocumentProperties().getProperty(STORED_EMAILS_KEY));
    if(emailList === null){
      emailList = [];
    }
  }

  // [{folderName: String, fileIteratorContinuationToken: String?, folderIteratorContinuationToken: String}]
  var recursiveIterator = JSON.parse(PropertiesService.getDocumentProperties().getProperty(RECURSIVE_ITERATOR_KEY));
  if (recursiveIterator !== null) {
    // verify that it's actually for the same folder
    if (rootFolder.getName() !== recursiveIterator[0].folderName) {
      console.warn("Looks like this is a new folder. Clearing out the old iterator.");
      recursiveIterator = null;
      emailList = null;
    } else {
      console.info("Resuming session.");
    }
  }
  if (recursiveIterator === null) {
    console.info("Starting new session.");
    recursiveIterator = [];
    recursiveIterator.push(makeIterationFromFolder(rootFolder));
  }

  while (recursiveIterator.length > 0) {
    recursiveIterator = nextIteration(recursiveIterator, startTime);
    var currTime = (new Date()).getTime();
    var elapsedTimeInMS = currTime - startTime;
    var timeLimitExceeded = elapsedTimeInMS >= MAX_RUNNING_TIME_MS;
    if (timeLimitExceeded & !debug) {
      PropertiesService.getDocumentProperties().setProperty(RECURSIVE_ITERATOR_KEY, JSON.stringify(recursiveIterator));
      PropertiesService.getDocumentProperties().setProperty(STORED_EMAILS_KEY, JSON.stringify(emailList));
      console.info("Stopping loop after '%d' milliseconds. Please continue running.", elapsedTimeInMS);
      return;
    }
  }

  console.info("Done running. Deleting Iterator Key");
  console.info("List of Emails Found: " + emailList.toString());
  deleteIteratorKeys();
}

function deleteIteratorKeys(){
  PropertiesService.getDocumentProperties().deleteProperty(RECURSIVE_ITERATOR_KEY);
  PropertiesService.getDocumentProperties().deleteProperty(STORED_EMAILS_KEY);
}

// process the next file or folder
function nextIteration(recursiveIterator) {
  var currentIteration = recursiveIterator[recursiveIterator.length-1];
  if (currentIteration.fileIteratorContinuationToken !== null) {
    var fileIterator = DriveApp.continueFileIterator(currentIteration.fileIteratorContinuationToken);
    if (fileIterator.hasNext()) {
      // process the next file
      var path = recursiveIterator.map(function(iteration) { return iteration.folderName; }).join("/");
      if(mode=="collect"){
        let currentFileOwnerEmail=fileIterator.next().getOwner().getEmail();
        if(!emailList.includes(currentFileOwnerEmail)){
          emailList.push(currentFileOwnerEmail);
        }
      }else{
        processFile(fileIterator.next(), path, recursiveIterator);
      }

      currentIteration.fileIteratorContinuationToken = fileIterator.getContinuationToken();
      recursiveIterator[recursiveIterator.length-1] = currentIteration;
      return recursiveIterator;
    } else {
      // done processing files
      currentIteration.fileIteratorContinuationToken = null;
      recursiveIterator[recursiveIterator.length-1] = currentIteration;
      return recursiveIterator;
    }
  }

  if (currentIteration.folderIteratorContinuationToken !== null) {
    var folderIterator = DriveApp.continueFolderIterator(currentIteration.folderIteratorContinuationToken);
    if (folderIterator.hasNext()) {
      // process the next folder
      var folder = folderIterator.next();

      //JV Consider analyze folder for delete here
      if(!debug && mode=="move"){
        considerDeleteFolder(folder);
      }

      recursiveIterator[recursiveIterator.length-1].folderIteratorContinuationToken = folderIterator.getContinuationToken();
      recursiveIterator.push(makeIterationFromFolder(folder));
      return recursiveIterator;
    } else {
      // done processing subfolders
      recursiveIterator.pop();
      return recursiveIterator;
    }
  }

  throw "should never get here";
}

function makeIterationFromFolder(folder) {
  //console.log("folder name: " + folder.getName());
  //console.log("file token: " + folder.getFiles().getContinuationToken());
  //console.log("folder token: " + folder.getFolders().getContinuationToken());
  return {
    folderName: folder.getName(), 
    folderId: folder.getId(),
    fileIteratorContinuationToken: folder.getFiles().getContinuationToken(),
    folderIteratorContinuationToken: folder.getFolders().getContinuationToken()
  };
}

function processFile(file, path, sourcefolderArray) {
  var isFileOwner = false;
  var isOnFileCopyList = false;

  fileOwnerEmail = file.getOwner().getEmail();
  console.log(path + "/" + file.getName() + " | " + fileOwnerEmail);

  //Test if the current user is the owner of the file
  if(currentUserEmail==fileOwnerEmail){
    isFileOwner = true;
    console.warn("File belongs to current user.");
  }
  //Test the file owner is on the copy & delete list
  if(emailsToAlwaysCopy.includes(fileOwnerEmail)){
    isOnFileCopyList = true;
    console.warn("File owner is on the always copy & delete list");
  }


  if(isFileOwner || isOnFileCopyList){
    
    //get Shared Team Drive
    var targetFolder = DriveApp.getFolderById(targetFolderId);
    //we need to skip value 0 since that is actually the source folder and we need to go one deeper
    //iterate SourceFolderArrary
    for (var i = 0; i < sourcefolderArray.length; i++){

      if(copyTheSourceFolder === false & i===0){continue;} //Skip the first folder in the path if you don't want the source as a sub folder

      console.log(sourcefolderArray[i].folderName);

      var targetChildFolders = targetFolder.getFolders();

      if(targetChildFolders.hasNext()){
        var folderExists = false;
        while(targetChildFolders.hasNext()){
          var childFolder = targetChildFolders.next();
          if (childFolder.getName().toString().trim()==sourcefolderArray[i].folderName.toString().trim()){
            //folder exists
            console.log("folder exists");
            targetFolder = childFolder;
            folderExists = true;
            break;
          }
        }
        if(!folderExists){
            console.log("Folder NOT Found During Search of Sub Folders.");
            newFolder = targetFolder.createFolder(sourcefolderArray[i].folderName);
            targetFolder = newFolder;
        }
      }else{
        console.warn("No Sub Folders Exist in the Target");
        newFolder = targetFolder.createFolder(sourcefolderArray[i].folderName);
        targetFolder = newFolder;
      }
      
    }

  //fire up the deleted folder for non-owned files
  var deletedFolder = DriveApp.getFolderById(deletedFolderId); 

  if(mode==="copy"){
    //if the file does not exist, then copy it
    if (targetFolder.getFilesByName(file.getName()).hasNext() === false){
      file.makeCopy(targetFolder);
    }else{
      console.log("Skipping File, already exists in the target Folder");
    }
  }else if(mode==="move"){
    //if the file does not exist, then move it or copy if the user is on the always copy list
    if (targetFolder.getFilesByName(file.getName()).hasNext() === false){
      if(isFileOwner){
        if(!debug){
          file.moveTo(targetFolder);
        }else{
          file.makeCopy(targetFolder);  
        }
      }else if(isOnFileCopyList){
        file.makeCopy(targetFolder);
        file.setName("Delete-Copied-"+ path.replace("/","-") + "-"+file.getName());
        if(!debug){
          //set trashed will not work for non-owned files
          file.moveTo(deletedFolder);
        }
      }
    }else{
      console.log("Skipping File, already exists in the target Folder");
      if(isOnFileCopyList || isFileOwner){
        file.setName("Delete-Copied-"+ path.replace("/","-") + "-"+file.getName());
      }
      if(!debug){
        file.moveTo(deletedFolder);        
      }
    }
  }else{
    throw new Error("You must specify mode as move or copy")
  }
      
    

    //Attempt to Delete Folders in the Array in Reverse Order

    //greater than equal to 1 is to skip the containing root folder.
    for (var x=sourcefolderArray.length-1; x >=1; x--){
      considerDeleteFolder(DriveApp.getFolderById(sourcefolderArray[x].folderId))
      
    }

  }

}

function considerDeleteFolder(folder){

  if(folder.getFiles().hasNext()){
    console.log("Source Folder "+folder.getName()+" has files.");
    return;
  }else{
    console.log("Source Folder "+folder.getName()+" does NOT have files.");
    //test to see if any sub folders
    if(folder.getFolders().hasNext()){
      console.log("Source Folder "+folder.getName()+" has sub folders.");
      return;
    }else{
      console.log("Source Folder "+folder.getName()+" does NOT have folders.");

      //Test if current user is the owner
      if(folder.getOwner().getEmail() === currentUserEmail){
        console.log("Source Folder "+folder.getName()+" is owned by " + currentUserEmail);

        console.log("Deleting Folder "+folder.getName());
        folder.setTrashed(true);
      }

      //if current user is the owner then delete folder
    }
  }
  return;


}
