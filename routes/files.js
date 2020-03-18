var express = require('express');
var router = express.Router();
var multer = require('multer');
var fs = require('fs');
var path = require('path');

const ipfsClient = require('ipfs-http-client');
const ipfs = ipfsClient(process.env.IPFS_CLIENT);

const crypto = require('crypto');
const algorithm = 'aes-256-cbc';// Using AES 256 Encryption

//Storage for encrypted uploads
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads');
  }
});
var upload = multer({ storage: storage });

//Render upload - checkUser & get patients/doctors list - same for both
router.get("/upload", function(req, res){
  if(req.session.currentUser) {

    var account = req.session.currentUser;

    req.app.locals.myContract.deployed().then(function(instance) {

            return instance.getAllUsers.call({from: account});

    }).then(function(result){
            res.render("upload", {types: result.types, names: result.names, addresses: result.addr});
    }).catch(function(error) {
        console.log(error);
        res.redirect("/dashboard");
    });

  } else {
    res.redirect("/");
  }
});

//Upload file AES+RSA encrypt, Add file to IPFS and return hash+key to Smart Contract
router.post("/upload", upload.single('fileToUpload'), function (req, res, next) {

  if(req.session.currentUser) {

    var account = req.session.currentUser;
    var to_account = req.body.selectedAccount;

    req.app.locals.myContract.deployed().then(function(instance) {

                    return instance.getPublicKey.call(to_account, {from: account});

                }).then(function(result) {

                    //Reading file uploaded
                    var inputFile = fs.readFileSync(req.file.path);
                    var fileName = req.file.originalname;
                    //Creating buffer for ipfs function to add file to the IPFS system
                    var fileBuffer = Buffer.from(inputFile);

                    //Generate key for every new file and write key and iv to keys folder
                    const key = crypto.randomBytes(32);
                    var iv = crypto.randomBytes(16);

                    //AES Encryption of File
                    var cipher = crypto.createCipheriv(algorithm, Buffer.from(key), iv);
                    var encrypted = cipher.update(fileBuffer);
                    encrypted = Buffer.concat([encrypted, cipher.final()]);
                    iv = iv.toString('hex');

                    //RSA Encryption of KEY
                    var pubKey = result; //from SMART CONTRACT

                    var pubKeyFile = crypto.publicEncrypt(pubKey, Buffer.from(key));
                    pubKeyFile = pubKeyFile.toString("base64");

                    //IPFS Encrypted File Upload
                    ipfs.add(encrypted, function (err, file) {
                      if (err) {
                        console.log(err);
                        res.redirect("/");
                      } else {
                        var hash = file[0].hash;

                        req.app.locals.myContract.deployed().then(function(instance) {

                                return instance.getUserName.call({from: account});

                        }).then(function(result){
                                
                                console.log(fileName+" encrypted and uploaded to IPFS");
                                res.render("dashboard", {to_account: to_account, fileName: fileName, hash: hash, pubKeyFile: pubKeyFile, iv: iv, name: result, account: account});

                                //Delete local file from server
                                fs.unlink(req.file.path, function(err){
                                  if(err) {
                                    console.log(err);
                                    res.redirect("/dashboard");
                                  }
                                    console.log("local file deleted");
                                });
                                
                        }).catch(function(error) {
                            console.log(error);
                            res.redirect("/dashboard");
                        });
                      }
                    });

                }).catch(function(error) {
                    console.log(error);
                    res.redirect("/dashboard");
                });

  } else {
    res.redirect("/");
  } 
});

//Render user files
router.get("/files", function(req, res){
  if(req.session.currentUser) {

    var account = req.session.currentUser;

    req.app.locals.myContract.deployed().then(function(instance) {

                    return instance.getSentFiles.call({from: account});

                }).then(function(result) {

                  var sentFiles = result;

                  req.app.locals.myContract.deployed().then(function(instance) {

                    return instance.getReceivedFiles.call({from: account});

                  }).then(function(result) {

                    var receivedFiles = result;

                    res.render("files", {sentFiles: sentFiles, receivedFiles: receivedFiles});

                  }).catch(function(error) {
                      console.log(error);
                      res.redirect("/dashboard");
                  });

                }).catch(function(error) {
                    console.log(error);
                    res.redirect("/dashboard");
                });
  } else {
    res.redirect("/");
  }
});

//View File - get key & iv from smart contract ask user to upload private key file
router.get("/file/:hash", function(req, res) {
  if(req.session.currentUser) {

    var account = req.session.currentUser;
    var hash = req.params.hash;

    req.app.locals.myContract.deployed().then(function(instance) {

                    return instance.getFile.call(hash, {from: account});

                }).then(function(result) {
                  if(result.name.length > 0) {
                    res.render("download", {fileName: result.name, secretKey: result.key, fileiv: result.iv, fileHash: hash});
                  } else {
                    res.redirect("/");
                  }

                }).catch(function(error) {
                  console.log(error);
                  res.redirect("/files");
              });
  } else {
    res.redirect("/");
  }
});

//Decrypt and Download file - RSA+AES decrypt - private key from user
router.post("/download", upload.single('fileToUpload'), function(req, res, next) {
  if(req.session.currentUser) {

    var secretKey = req.body.fileKey;
    var privKey = fs.readFileSync(req.file.path);
    var hash = req.body.fileHash;
    var iv = req.body.fileiv;
    var fileName = req.body.fileName;

    //RSA Decryption KEY
    var aeskey_dec = crypto.privateDecrypt({
				      key: privKey,
				      passphrase: 'top secret',
				    }, Buffer.from(secretKey, "base64"));

    //Get file contents from IPFS using hash
    ipfs.get(hash, function(err, files) {
      if (err) {
        console.log(err);
        res.redirect("/dashboard");
      } else {

          //AES Decryption File
          var encryptedText = files[0].content;
          var decipher = crypto.createDecipheriv(algorithm, Buffer.from(aeskey_dec), Buffer.from(iv, 'hex'));
          var decrypted = decipher.update(encryptedText);
          decrypted = Buffer.concat([decrypted, decipher.final()]);
          fs.writeFile("downloads/"+fileName, decrypted, function(err) {
            if(err) {
              console.log(err);
              res.redirect("/dashboard");
            }
            console.log(fileName+" decrypted!");

              //Force download to user and delete local file from server
              res.download("downloads/"+fileName, fileName, function (err) {
              if (err) {
                console.log(err);
                res.redirect("/dashboard");
              } else {

                fs.unlink("downloads/"+fileName, function(err){
                  if(err) {
                    console.log(err);
                    res.redirect("/dashboard");
                  }
                  console.log("local file deleted");
                });

                fs.unlink(req.file.path, function(err){
                  if(err) {
                    console.log(err);
                    res.redirect("/dashboard");
                  }
                });
              }
            });

          });
      }
    });

  } else {
    res.redirect("/");
  }
});

module.exports = router;