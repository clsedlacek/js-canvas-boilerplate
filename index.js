(() => {
	const appConfig = {
		fillStyle: 'rgba(255, 0, 0, 1)',
		preloadImages: [
			{name: 'example', url: 'img/example.jpg'}
		]
	}

	const appState = {
		renderCanvas: null,
		animationFrame: null,
		images: {
		},
	}

	function convertImageToImageData(convertImage, borderColor, borderWidth) {
		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d');

		let bw = borderWidth ? borderWidth : 0;
		let bc = borderColor ? borderColor : {r: 0, g: 0, b: 0, a: 0};

		canvas.width = (convertImage.naturalWidth+(bw*2));
		canvas.height = (convertImage.naturalHeight+(bw*2));

		const r = (bc.r);
		const g = (bc.g);
		const b = (bc.b);
		const a = (bc.a);
		ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a})`;
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		ctx.drawImage(convertImage, borderWidth, borderWidth);
		const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
		return imageData;
	}

	function getPixelArrayIndexRGB(pixelArray, pixelRedIndex) {
		const gIndex = pixelRedIndex+1;
		const bIndex = pixelRedIndex+2;
		const aIndex = pixelRedIndex+3;
		if ((pixelArray.length-1) < (aIndex)) {
			throw `getPixelArrayIndexRGB: pixel given by indice set (${pixelRedIndex},${gIndex},${bIndex},${aIndex}) goes outside pixelArray bounds`;
		}
		return {
			r: pixelArray[pixelRedIndex],
			g: pixelArray[gIndex],
			b: pixelArray[bIndex],
			a: pixelArray[aIndex]
		}
	}

	function compareRGB(aColor, bColor) {
		// leaving out alpha comparison for now unless it becomes necessary
		return (
			(aColor.r === bColor.r) &&
			(aColor.g === bColor.g) &&
			(aColor.b === bColor.b) //&&
			//(aColor.a === bColor.a)
		);
	}

	function checkPixelEmpty(pColor) {
		return (
			(pColor.r === 0) &&
			(pColor.g === 0) &&
			(pColor.b === 0) &&
			(pColor.a === 0)
		);
	}

	function getPixelMooreNeighborIndices(pixelArray, imagePixelWidth, pixelRedIndex) {
		// 1 pixel = 4 array items rgba
		const pixelSize = 4;
		const rowSize = pixelSize*imagePixelWidth;

		const pLeftIndex = (pixelRedIndex - pixelSize);
		const pTopLeftIndex = (pixelRedIndex - rowSize - pixelSize);
		const pTopIndex = (pixelRedIndex - rowSize);
		const pTopRightIndex = (pixelRedIndex - rowSize + pixelSize);
		const pRightIndex = (pixelRedIndex + pixelSize);
		const pBottomRightIndex = (pixelRedIndex + rowSize + pixelSize);
		const pBottomIndex = (pixelRedIndex + rowSize);
		const pBottomLeftIndex = (pixelRedIndex + rowSize - pixelSize);

		const pNeighbors = [
			pLeftIndex, pTopLeftIndex,
			pTopIndex, pTopRightIndex,
			pRightIndex, pBottomRightIndex,
			pBottomIndex, pBottomLeftIndex
		];

		return pNeighbors;
	}

	function convertPixelIndexToXY(imagePixelWidth, pixelIndex) {
		const pixelIndexSize = 4;
		const rowIndexWidth = imagePixelWidth * pixelIndexSize;
		const y = Math.floor(pixelIndex / rowIndexWidth);
		const x = Math.floor((pixelIndex - (y * rowIndexWidth)) / pixelIndexSize);
		return {x, y};
	}

	function clearImageDataPixel(maskImageData, pixelIndex) {
		maskImageData[pixelIndex] = 0;
		maskImageData[pixelIndex+1] = 0;
		maskImageData[pixelIndex+2] = 0;
		maskImageData[pixelIndex+3] = 0;
	}

	function showDebugCanvasImageData(imageData, description) {
		const debugEl = document.getElementById('debug');
		const canvasContainer = document.createElement('div');
		canvasContainer.classList.add('debug-canvas-container');
		const debugCanvas = document.createElement('canvas');
		debugCanvas.classList.add('debug-canvas');

		canvasContainer.appendChild(debugCanvas);
		debugEl.appendChild(canvasContainer);

		if (description) {
			const descriptionEl = document.createElement('div');
			descriptionEl.classList.add('debug-description');
			descriptionEl.appendChild(document.createTextNode(description));
			canvasContainer.appendChild(descriptionEl);
		}

		debugCanvas.width = imageData.width;
		debugCanvas.height = imageData.height;
		const ctx = debugCanvas.getContext('2d');
		ctx.putImageData(imageData, 0, 0);
	}

	function renderLoading(state, config, canvas, timestamp, loadingText) {
		const ctx = canvas.getContext('2d');
		const {width, height} = canvas;
		ctx.fillStyle = 'rgba(255, 255, 255, 1)';
		ctx.fillRect(0, 0, width, height);

		const fontSize = 16;
		ctx.font = `${fontSize}px Helvetica, Arial, sans-serif`;
		const textContent = loadingText || 'Loading...';
		const textWidth = ctx.measureText(textContent).width;
		ctx.fillStyle = 'rgba(0, 0, 0, 1)';
		ctx.fillText(textContent, (width/2)-(textWidth/2), (height/2)-(fontSize/2));
	}

	function renderPixelList(state, config, canvas, timestamp, pixels, color) {
		if (!pixels || !pixels.length) {
			return null;
		}
		const ctx = canvas.getContext('2d');
		const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
		const data = imageData.data;
		for (let i=0; i<pixels.length; i++) {
			const r = color.r;
			const g = color.g;
			const b = color.b;
			const a = color.a;
			const rIndex = pixels[i];
			const gIndex = rIndex + 1;
			const bIndex = rIndex + 2;
			const aIndex = rIndex + 3;
			data[rIndex] = r;
			data[gIndex] = g;
			data[bIndex] = b;
			data[aIndex] = a;
		}
		ctx.putImageData(imageData, 0, 0);
	}

	function renderFrame(state, config, canvas, timestamp) {
		const ctx = canvas.getContext('2d');
		if (checkImageLoaded(state.images.example)) {
			ctx.drawImage(state.images.example, 0, 0);
		}
		else {
			renderLoading(state, config, canvas, timestamp, 'Loading example image...');
		}

		ctx.fillStyle = config.fillStyle;
		ctx.fillRect(canvas.width/4, canvas.height/4, 2*canvas.width/4, 2*canvas.height/4);
		renderPixelList(state, config, canvas, timestamp, [0, 20, 24, 28, 40, 44, 48, 2000, 2020, 2024, 2028, 2040, 2044, 2048], {r: 0, g: 255, b: 255, a: 255});
	}

	function renderLoop(state, config, canvas, timestamp) {
		renderFrame(state, config, canvas, timestamp);
		state.animationFrame = window.requestAnimationFrame(timestamp => renderLoop(state, config, canvas, timestamp));
	}

	function checkImageLoaded(image) {
		return (image && image.complete && (image.naturalWidth !== 0));
	}

	function initRender(state, config, canvas) {
		state.animationFrame = window.requestAnimationFrame(timestamp => renderLoop(state, config, canvas, timestamp));
	}

	function initImageFromURL(url, loadCallback) {
		if (!url) {
			throw 'initImageFromURL: Missing or unreadable image URL';
		}
		const initImage = new Image();
		initImage.src = url;
		initImage.onload = () => {
			console.log(`initImageFromURL: Image ${url} finished loading`);
			if (loadCallback) {
				loadCallback(initImage);
			}
		};
		return initImage;
	}

	function initPreloadImages(state, config) {
		if (!config.preloadImages || !config.preloadImages.length) {
			return null;
		}
		for (let i=0; i<config.preloadImages.length; i++) {
			const current = config.preloadImages[i];
			const key = current.name || current.url || i;
			initImageFromURL(current.url, (img => state.images[key] = img));
		}
	}

	function init(state, config) {
		const renderCanvas = document.getElementById('render-canvas');
		renderCanvas.width = 500;
		renderCanvas.height = 500;

		initPreloadImages(state, config);
		initRender(state, config, renderCanvas);
		console.log('Initialized');
	}

	init(appState, appConfig);
})();