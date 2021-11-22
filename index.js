// npm install init
// npm install adm-zip
// npm install iconv-lite
// npm install @sendgrid/mail

// zip -r function.zip .


const AdmZip = require('adm-zip');
const iconv = require("iconv-lite")
const sgMail = require("@sendgrid/mail")
const url = require("url")

const API_KEYS = process.env.API_KEYS
const SENDGRID_FROM_ADDRESS = process.env.SENDGRID_FROM_ADDRESS
const ACCESS_KEY = process.env.ACCESS_KEY 

exports.handler =  function(event, context, callback) {
  try {
    const access_key = JSON.parse(event.body).form_params['access_key']
    if (access_key !== ACCESS_KEY ) {
      const res = { statusCode: 401 }
      callback(null, res)
      // callback(Error('402'))
    }
    
    // get zip data
    const scheduled_plan = JSON.parse(event.body).scheduled_plan
    const attachement = JSON.parse(event.body).attachment
    const formParams = JSON.parse(event.body).form_params

    if (scheduled_plan && scheduled_plan.download_url && scheduled_plan.download_url !== "") {
      //res.status(200).send(req.scheduled_plan.download_url);
      const res = {
        statusCode: 200,
        url: JSON.parse(scheduled_plan).download_url
      }
      callback(null,res)
      
    } else if (attachement && attachement.mimetype && attachement.mimetype === "application/zip;base64"){
      // read Zip
      const buffer = Buffer.from(attachement.data, "base64");
      const zip = new AdmZip(buffer);
      const zipEntries = zip.getEntries()

      const wZip = new AdmZip()

      zipEntries.forEach((entry) => {
        const decoded = iconv.decode(Buffer.from(zip.readAsText(entry)),"utf8")
        const encoded = iconv.encode(decoded, formParams["encoding"])
        wZip.addFile(entry.entryName, Buffer.alloc(encoded.length, encoded))
      })

      const attachZip = wZip.toBuffer().toString("base64")
      // send email
      sgMail.setApiKey(API_KEYS)
      const msg = {
        to: formParams["recipient"],
        from: SENDGRID_FROM_ADDRESS, // sendgridのAPIで登録したアドレスから送信されます。異なるとエラーになります
        subject: formParams["subject"],
        text: formParams["bodytext"],
        attachments: [
          {
            content: attachZip,
            filename: scheduled_plan.title + ".zip",
            type: "application/zip",
            disposition: "attachment"
          }
        ]
      }

      sgMail
        .send(msg)
        .then(() => {
          console.log('Successfully Sent');
          // res.status(200).send("Email sent");
          
          const res = { statusCode: 200 }
          callback(null,res)
        })
        .catch((error) => {
          console.error(error)
          // res.status(504).send(error);
          const res = { statusCode: 504 }
          callback(null,res)
        })
    } else {
      // res.status(504).send("Invalid parameter");
      const res = { statusCode: 504 }
      callback(null,res)
    }
  } catch (e) {
    console.log("got error:" + e);
    // res.status(500).send(e);
    const res = { statusCode: 500 }
    callback(null,res)
  }
}