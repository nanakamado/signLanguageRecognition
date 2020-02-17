const imageScaleFactor = 0.2;
const outputStride = 16;
const flipHorizontal = false;
const stats = new Stats();
const contentWidth = 480;
const contentHeight = 270;
let model;

const handTrackJsModel = {
    flipHorizontal: true,   // flip e.g for video
    maxNumBoxes: 2,        // maximum number of boxes to detect
    iouThreshold: 0.5,      // ioU threshold for non-max suppression
    scoreThreshold: 0.6,    // confidence threshold for predictions.
};


bindPage();

handTrack.load(handTrackJsModel).then(lmodel => {
    // detect objects in the image.
    model = lmodel
    document.getElementById('message').innerText = 'loaded!';
});


async function bindPage() {
    const net = await posenet.load();
    let video;
    try {
        video = await loadVideo();
    } catch(e) {
        console.error(e);
        return;
    }
    detectPoseInRealTime(video, net);
}


async function loadVideo() {
    const video = await setupCamera();
    video.play();
    return video;
}

async function setupCamera() {
    const video = document.getElementById('video');
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
            'audio': false,
            'video': true});
        video.srcObject = stream;

        return new Promise(resolve => {
            video.onloadedmetadata = () => {
                resolve(video);
            };
        });
    } else {
        const errorMessage = "This browser does not support video capture, or this device does not have a camera";
        alert(errorMessage);
        return Promise.reject(errorMessage);
    }
}

function detectPoseInRealTime(video, net) {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const flipHorizontal = true;


    async function poseDetectionFrame() {
        stats.begin();
        let poses = [];
        const pose = await net.estimateSinglePose(video, imageScaleFactor, flipHorizontal, outputStride);
        poses.push(pose);

        ctx.clearRect(0, 0, contentWidth,contentHeight);

        ctx.save();
        ctx.scale(-1, 1);
        ctx.translate(-contentWidth, 0);
        ctx.drawImage(video, 0, 0, contentWidth, contentHeight);
        ctx.restore();

        poses.forEach(({ score, keypoints }) => {
            // keypoints[9]には左手、keypoints[10]には右手の手首が推定されている
            // Todo 描写するかどうかは、とりあえず閾値を決め打ちしたが閾値の取り決めはopennetの精度を見て決める
            //　スライドバーで設定できたらいい鴨
            if (keypoints[9].score > 0.5){
                drawWristPoint(keypoints[9],ctx);
                console.log("left");
            }
            if (keypoints[10].score > 0.5){
                drawWristPoint(keypoints[10],ctx);
                console.log("right");
            }
        });

        stats.end();

        requestAnimationFrame(poseDetectionFrame);
    }

    async function predictHands() {
        model.detect(video).then(predictions => {
            console.log("Predictions: ", predictions);
            model.renderPredictions(predictions, canvas, ctx, video);
            requestAnimationFrame(predictHands);
        });
    }

    predictHands();
    poseDetectionFrame();
}

function drawWristPoint(wrist,ctx){
    ctx.beginPath();
    //手首の座標が反転しているため座標のx軸を反転
    //Canvasの座標はx,y軸は左上から(0, 0)
    ctx.arc(contentWidth - wrist.position.x , wrist.position.y, 7, 0, 2 * Math.PI);
    ctx.fillStyle = "red";
    ctx.fill();
}