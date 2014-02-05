var SerialPort = require("serialport").SerialPort;
var serialPort = new SerialPort("COM28", {
  baudrate: 115200
});

var moment = require('moment');
var events = require('events');

var status_events = new events.EventEmitter();


var at_command = {'0':'AT\n', '1':'ATE0\n', '2':'AT+XDUM=0\n', '3':'AT+BDATA=1\n',
                  '4':'AT+WD\n', '5':'AT+NDHCP=1\n', '6':'AT+WSEC=2\n', '7':'AT+WWEP1=0123456789\n', 
                  '8':'AT+WA=gsbc3\n', '9':'AT+NCTCP=121.78.237.160,9002\n'};

var event_state = 0;
var CID = 0;
var timer;
var at_header = "\x1b\x5a";
var at_end = "\x1b\x45";
var buf_str = "\x7e\x45\x00\xff\xff\x00\x00\x14\x00\x63\x00\x66\x3f\xc9\xd5\x15\x00\x00\x56\x56\xf4\xf6\x00\x00\x00\xfd\x00\x00\x00\x00\x28\x16\x7e";
var recevie_buf = '';

serialPort.on("open", function () {
  console.log('Start.......');
  serialPort.write(at_command[event_state], function(err, results) {});

  serialPort.on('data', function(data) {
    var pos;
    recevie_buf += data.toString().replace(/\n/gi,'');
    recevie_buf = recevie_buf.replace(/\r/gi,'');

    console.log(recevie_buf);

    if(recevie_buf.indexOf(']') < 0) {
      return;
    } else if(recevie_buf.indexOf("Disassociation") >= 0) {
      clearInterval(timer);
      status_events.emit('status', event_state=0);
    } else if(event_state == 10 && (pos = recevie_buf.indexOf("DISCONNECT")) >=0){
      clearInterval(timer);
      status_events.emit('status', event_state=8);
    } else if(event_state == 10 && (pos = recevie_buf.indexOf("CONNECT")) >=0){
      CID = parseInt(recevie_buf.substr(pos+8, pos+9));
      console.log('CID = ' + CID);
      event_state = 11;
      start_to_send_data();
    } else if(event_state == 11 && (pos = recevie_buf.indexOf("OK")) >=0){
      console.log('Send Done!!');
    } else if(recevie_buf.indexOf("OK") >= 0 ){
      console.log('AT success : ' + event_state);
      status_events.emit('status', event_state++);
    } else if(recevie_buf.indexOf("ERROR") >= 0){
      console.log('AT fail : ' + event_state);
      status_events.emit('status', event_state=0);
    }
    recevie_buf = '';

  });  
});

status_events.on('status', function(status) {
  serialPort.write(at_command[status], function(err, results) {
    if(err) {
      console.log('write fail : ' + status + ' = '  + err);  
      status_events.emit('status', event_state=0);
    } else {
      console.log('write success : ' + status + ' = '  + results);  
    }
  });  
});

function start_to_send_data() {
  timer = setInterval(function() {
    var data = at_header + CID + "\x30\x30" + buf_str.toString().length.toString() + buf_str;
    var buffer = new Buffer(data, "binary");
    var time = moment().format('YYYY-MM-DD HH:mm:ss');
    console.log(time + 'Sent!!');
    serialPort.write(data, function(err, results) {
      if(err) console.log(err);
    });
  }, 1000);
}







