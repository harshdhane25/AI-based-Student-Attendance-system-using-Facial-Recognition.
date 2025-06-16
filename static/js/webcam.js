function initWebcam(videoId) {
    const video = document.getElementById(videoId);
    navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
        video.srcObject = stream;
    });
}

function captureFrame(frameArray, single = false) {
    return new Promise((resolve) => {
        const video = document.getElementById('video');
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const isEmpty = !imageData.data.some(channel => channel !== 0);
        if (!isEmpty) {
            const image = canvas.toDataURL('image/jpeg');
            if (!single) frameArray.push(image);
            resolve(image);
        } else resolve(null);
    });
}