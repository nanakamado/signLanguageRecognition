const video = document.getElementById("myvideo");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
let trackButton = document.getElementById("trackbutton");
// let predictButton = document.getElementById("predictbutton");
let updateNote = document.getElementById("updatenote");
let isVideo = false;
let handModel = null;
let signModel = null;


//hand tracking params
const modelParams = {
    flipHorizontal: true,
    maxNumBoxes: 1,
    iouThreshold: 0.5,
    scoreThreshold: 0.55,
};

//sign predict declaration
const classes = {0:'zero', 1:'one', 2:'two', 3:'three', 4:'four',5:'five', 6:'six', 7:'seven', 8:'eight', 9:'nine'};
const signModelPath = "http://localhost:8080/sign_language_vgg16/model.json";



function startVideo() {
    handTrack.startVideo(video).then(function (status) {
        console.log("video started", status);
        if (status) {
            updateNote.innerText = "Video started. Now predicting";
            isVideo = true;
            runDetection()
        } else {
            updateNote.innerText = "Please enable video"
        }
    });
}

function toggleVideo() {
    if (!isVideo) {
        updateNote.innerText = "Starting video";
        trackButton.innerText = "Video OFF";
        startVideo();
    } else {
        updateNote.innerText = "Stopping video";
        handTrack.stopVideo(video);
        isVideo = false;
        updateNote.innerText = "Video stopped"
        trackButton.innerText = "Video ON";

    }
}

//--------hand tracking--------
trackButton.addEventListener("click", function(){
    toggleVideo();
});


function runDetection() {
    handModel.detect(video).then(predictions => {
        if (predictions.length !== 0){
            signPredict()
        }
        handModel.renderPredictions(predictions, canvas, ctx, video);
        if (isVideo) {
            requestAnimationFrame(runDetection);
        }
    });

}

//--------sign predict--------
//predict
async function signPredict(){
    let tensor = captureWebcam();
    let prediction = await signModel.predict(tensor).data();
    let results = Array.from(prediction)
        .map(function(p,i){
            return {
                probability: p,
                className: classes[i]
            };
        }).sort(function(a,b){
            return b.probability-a.probability;
        }).slice(0,1);
    results.forEach(function(p){
        if (p.probability > 0.3) {
            ctx.font = "32px Arial";
            ctx.fillText("This number is  " + p.className, 10, 50)
            console.log(p.className + " : "+ p.probability)
        }
    });
}

//to canvas
function captureWebcam() {
    // Todo ここをhand trackingで取得したエリアに変更
    canvas.width  = video.width;
    canvas.height = video.height;

    ctx.drawImage(video, 0, 0, video.width, video.height);
    tensor_image = preprocessImage(canvas);

    return tensor_image;
}


function preprocessImage(image){
    let tensor = tf.fromPixels(image).resizeNearestNeighbor([100,100]).toFloat();
    let offset = tf.scalar(255);
    return tensor.div(offset).expandDims();
}

//--------Load model--------
//Load sign model
async function loadSignModel() {
    signModel = await tf.loadModel(signModelPath);
    console.log("sign model loaded.");
}


// Load handtrack model
handTrack.load(modelParams).then(lhandmodel => {
    // detect objects in the image.
    handModel = lhandmodel;
    console.log("handtrack model loaded");
    loadSignModel();
    updateNote.innerText = "Loaded Model!";
    trackButton.disabled = false
});