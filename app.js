var express = require('express');
var app = express();
var path = require('path');
var formidable = require('formidable');
var fs = require('fs');
var io = require('socket.io').listen(server, {
  log: false,
  origins: '*:*'
})
var uuid = require('node-uuid');
var sys = require('sys'),
  exec = require('child_process').exec;

var uuid1 = '';

app.get('/', function(req, res) {;
  res.send("API");
});

app.post('/upload', function(req, res) {

  var uuid1 = uuid.v1();

  // create an incoming form object
  var form = new formidable.IncomingForm();

  // specify that we want to allow the user to upload multiple files in a single request
  form.multiples = true;

  // store all uploads in the /uploads directory
  form.uploadDir = path.join(__dirname, '/captures');

  // every time a file has been uploaded successfully,
  // rename it to it's orignal name
  var imgName = uuid1 + '.jpg';

  form.on('file', function(field, file) {
    fs.rename(file.path, path.join(form.uploadDir, imgName));
  });

  // log any errors that occur
  form.on('error', function(err) {
    console.log('An error has occured: \n' + err);
  });

  // once all the files have been uploaded, send a response to the client
  form.on('end', function() {
    res.end('success');
  });

  // parse the incoming request containing the form data
  form.parse(req);

});

//route to handle a client calling node to check a plage
app.get('/check_plate', function(req, res) {

  //generate a guid to use in the captured image file name

  //tell the webcam to take a picture and store it in the captures directory using the guid as the name
  // exec('fswebcam -r 1280x720 --no-banner --quiet ./captures/' + uuid1 + '.jpg',
  //   function (error, stdout, stderr) {
  //     if (error !== null) {
  //       //log any errors
  //       console.log('exec error: ' + error);
  //     }
  // });

  if (uuid1 != '') {

    // alpr DSC03145.jpg -c pt -p pt -n 40
    //now that we have a picture saved, execute parse it with openalpr and return the results as json (the -j switch) 
    exec('alpr -j ./captures/' + uuid1 + '.jpg -c pt -p -pt',
      // exec('alpr -j ./captures/pjukRD0.jpg',
      function(error, stdout, stderr) {
        //create a json object based on the alpr output
        var plateOutput = JSON.parse(stdout.toString());

        //add an "image" attribute to the alpr json that has a path to the captured image
        //this is so the client can view the license plage picture to verify alpr parsed it correctly
        plateOutput.image = '/captures/' + uuid1 + '.jpg';
        // plateOutput.image = '/captures/pjukRD0.jpg';

        //set some headers to deal with CORS
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "X-Requested-With");

        //send the json back to the client
        res.json(plateOutput);

        //log the response from alpr
        console.log('alpr response: ' + stdout.toString());

        if (error !== null) {
          //log any errors
          console.log('exec error: ' + error);
        }
      });
  } else {
    res.json("Nenhum arquivo para processar!");
  }
});

var server = app.listen(3000, function() {
  console.log('Server listening on port 3000');
});