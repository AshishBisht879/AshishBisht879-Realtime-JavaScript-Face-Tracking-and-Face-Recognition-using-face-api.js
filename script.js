let video = document.createElement("video");
let camOn = false;
let canvas;
let faceDetection;
let webCamBtn = document.getElementById("webCamBtn");
let localstream;
let Videodiv = document.getElementById("Videodiv");

Promise.all([
   faceapi.nets.tinyFaceDetector.loadFromUri('./models'),
   faceapi.nets.faceLandmark68Net.loadFromUri('./models'),
   faceapi.nets.faceRecognitionNet.loadFromUri('./models'),
   faceapi.nets.faceExpressionNet.loadFromUri('./models'),
   faceapi.nets.ssdMobilenetv1.loadFromUri('/models') // use for detecting the Face
]).then(() => {
    GetMediaDevices("videoinput")
        .then((AttachedDevices) => {updateCameraList(AttachedDevices)});
    document.getElementById('imageupload').disabled = false;
    document.getElementById('LoadModel').remove();
})
.catch((err)=>{console.log("\nError While Loading Models !! \n"+err);});


async function GetMediaDevices(type) {
    let List_Label = [];
    let List_DeviceID = [];
    if(navigator.mediaDevices.getUserMedia)
    {
    await navigator.mediaDevices.enumerateDevices().then((stream) => {
        console.log(stream);
        stream.forEach((cameras) => {
            if (cameras.kind === type) {
                List_Label.push(cameras.label);
                List_DeviceID.push(cameras.deviceId);
            }
        });
    });
    return {
        List_Label,
        List_DeviceID,
    };
}
else
{
    alert("\nNo media Device Found\n");
    throw new Error("Stop script");
}

}




function updateCameraList(List) {
    try {
        let choose = document.getElementById("dropdown_camera");
        let count = 1;
        choose.innerHTML = "";
        List.List_Label.forEach(function (camera, index) {
            const option = document.createElement("option");
            option.label = camera || `Camera ${count++}`;
            option.value = List.List_DeviceID[index];
            choose.appendChild(option);
        });
        choose.selectedIndex = "0"; //select the first value as default

        choose.removeAttribute("disabled");
        webCamBtn.removeAttribute("disabled");

    } catch (err) {
        console.log("\n\n!!Error in updateCameraList\n" + err);
        alert(
            "!! Video Input Device Error !!"
        );
    }
}



video.addEventListener('play', () => {
    canvas = faceapi.createCanvasFromMedia(video);
    Videodiv.append(canvas);
    const dimensions = {
        width: video.offsetWidth,
        height: video.offsetHeight
    };
    faceapi.matchDimensions(canvas, dimensions);
    faceDetection = setInterval(async () => {
        const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceExpressions();
        //const detections = await faceapi.detectAllFaces(video).withFaceLandmarks().withFaceDescriptors().withFaceExpressions();
        // const LabledFaceDescriptors = await loadlabeledimages();
        // const faceMatcher = new faceapi.FaceMatcher(LabledFaceDescriptors, 0.6);

        const resize = faceapi.resizeResults(detections, dimensions);
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
        faceapi.draw.drawDetections(canvas, resize);
        faceapi.draw.drawFaceLandmarks(canvas, resize);
        faceapi.draw.drawFaceExpressions(canvas, resize);


        // const endResult = await resize.map(match => faceMatcher.findBestMatch(match.descriptor));
        //  endResult.forEach((detect, i) => {
        //      const box = resize[i].detection.box;
        //      const drawbox = new faceapi.draw.DrawBox(box, {
        //          label: detect.toString()
        //      });
        //      drawbox.draw(canvas);
        //  })
    }, 100);
});

webCamBtn.addEventListener('click', async () => {

    let camID = document.getElementById("dropdown_camera");

    if (camOn == false) {
        camOn = true;
        webCamBtn.textContent = "Off WebCam";
        video.muted = true;
        video.autoplay = true;
        Videodiv.append(video);
        await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
                deviceId: {
                    exact: camID.value
                }
            }
        }).then((stream) => {
            localstream = stream;
            video.srcObject = localstream;
            video.muted = true
        });
    } else {
        if (faceDetection) clearInterval(faceDetection);
        camOn = false;
        webCamBtn.textContent = "On WebCam";
        localstream.getTracks().forEach(function (track) {
            track.stop();
        });
        //canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
        //canvas.remove();
        let can = Videodiv.getElementsByTagName("canvas");
        console.log(can);
        console.log(can.length)
        let len=can.length;

        while(len) {
            can[len-1].remove();
           // can[len-1].parentNode.removeChild(can[len-1]);  
            len=can.length;
        }
        video.remove();
    }
});



let imageupload = document.getElementById("imageupload");
let detectBtn = document.getElementById("FaceDetectBtn");
let Imagediv = document.getElementById("Imagediv");
let image;
let canvasImg;
let detectStarted = false;

imageupload.addEventListener('change', () => {

    if (!imageupload.files[0]) { //if no image is chosen after a face detection has already been performed over some image. 
        alert('Select a Image..!!!');
        if (!detectBtn.hasAttribute('disabled')) {
            detectBtn.setAttribute('disabled', true);


            detectStarted = false;
            detectBtn.textContent = "Detect Face";
            //canvasImg.getContext('2d').clearRect(0, 0, canvasImg.width, canvasImg.height);
            canvasImg.remove();
            image.remove();
        }

        return;
    }
    detectBtn.removeAttribute('disabled');
    if (detectStarted) {
        detectStarted = false;
        detectBtn.textContent = "Detect Face";
        //canvasImg.getContext('2d').clearRect(0, 0, canvasImg.width, canvasImg.height);
    }
    if (canvasImg) canvasImg.remove();
    if (image) image.remove();

});


detectBtn.addEventListener('click', async () => {

    if (!detectStarted) {
        detectStarted = true;
        detectBtn.textContent = "Remove Image";
        image = await faceapi.bufferToImage(imageupload.files[0]);
        Imagediv.append(image);
        const detection = await faceapi.detectAllFaces(image).withFaceLandmarks().withFaceDescriptors();
        canvasImg = await faceapi.createCanvasFromMedia(image);
        const dimensions = {
            width: image.offsetWidth,
            height: image.offsetHeight
        };
        faceapi.matchDimensions(canvasImg, dimensions);
        Imagediv.append(canvasImg);

        const LabledFaceDescriptors = await loadlabeledimages();

        const faceMatcher = new faceapi.FaceMatcher(LabledFaceDescriptors, 0.6);

        const resize = faceapi.resizeResults(detection, dimensions);

        const endResult = resize.map(match => faceMatcher.findBestMatch(match.descriptor));

        endResult.forEach((detect, i) => {
            const box = resize[i].detection.box;
            const drawbox = new faceapi.draw.DrawBox(box, {
                label: detect.toString()
            });
            drawbox.draw(canvasImg);
        })
    } else {
        detectStarted = false;
        detectBtn.textContent = "Detect Face";
        //if(!detectBtn.hasAttribute('disabled'))detectBtn.setAttribute('disabled',true);
        // canvasImg.getContext('2d').clearRect(0, 0, canvasImg.width, canvasImg.height);
        if (canvasImg) canvasImg.remove();
        image.remove();
    }
});


function loadlabeledimages() {
    const label = ['Jeff Bezos','Elon Musk','Sundar Pinchai'];
    return Promise.all(label.map(async (labe) => {
        let descriptions = [];
        for (let i = 1; i <= 4; i++) {
            const img = await faceapi.fetchImage(`./labeled_images/${labe}/${i}.jpg`);
            const detections = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
            descriptions.push(detections.descriptor);
        }
        return new faceapi.LabeledFaceDescriptors(labe, descriptions);
    }))
}








