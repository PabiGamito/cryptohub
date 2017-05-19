// TODO: Mark chart line margin larger, but only spark line margin not general margin

// Defines c as the canvas object
var c = document.getElementById("sparkline");
var ctx = c.getContext("2d");
var margin = 10;
var priceData = [];
var frame = 0;
var animating = false;
var latestPricePointDate = null;
var firstPricePointDate = null;

resizeCanvas();
window.addEventListener('resize', resizeCanvas, false);
function resizeCanvas() {
  c.width = $("section#content").width();
  c.height = $("section#content").height()/2;
}

var currentMousePos = { x: -1, y: -1 };
$("canvas").mousemove(function(e) {
  currentMousePos.x = e.offsetX;
  currentMousePos.y = e.offsetY;
  refreshCanva();
  renderPointer(e.offsetX, e.offsetY);
});

// Functions to get the max and min value of an array
function maxVal(array) {
	return Math.max.apply(Math, array);
}
function minVal(array) {
	return Math.min.apply(Math, array);
}

function animate(){
  animating = true;
  setTimeout(function() {
    requestAnimationFrame(animate);
  }, 500);
  refreshCanva();
  frame++;
}

function refreshCanva() {
  ctx.clearRect(0, 0, c.width, c.height);
  renderCanvas();
}

// Function that draws the graph
function renderCanvas() {
  var timeNow = new Date();
  var sparkLineBeginTime = new Date(firstPricePointDate*1000).getTime();
  var sparkLineEndTime = new Date(latestPricePointDate*1000).getTime();
  var nextHour = timeNow.getHours()+1;
  var endOptionTime = new Date(timeNow.getFullYear(), timeNow.getMonth(), timeNow.getDate(), nextHour, 0, 0).getTime();
  var secondsTillExpiration = (endOptionTime-timeNow.getTime());
  var sparkLineTime = sparkLineEndTime - sparkLineBeginTime;
  var graphTime = secondsTillExpiration + sparkLineTime;

  if ( $("#put:hover").length ) {
    renderPutOverlay();
  } else if ( $("#call:hover").length ) {
    renderCallOverlay();
  }

  sparkLineWidth = ( (c.width-margin*2) * sparkLineTime ) / graphTime;

  renderSparkLine(sparkLineWidth); // rendersSparkLine and returns SparkLine end Coordinates

  if ( $("canvas:hover").length ) {
    renderPointer(currentMousePos.x, currentMousePos.y);
  }
}

// Converts priceData to spark data points so that the min value has y = 0
// This allows for easier calculating height ratio to scale height properly
// Otherwise it often looks like a strait line
function priceToSparkData(priceData) {
  var min = minVal(priceData);
  var spark = [];
  for (i=0; i < priceData.length; i++) {
    spark.push(priceData[i]-min);
  }
  return spark;
}

function setGradiantColor() {
  // Define the line color gradiant
	var grad = ctx.createLinearGradient(0, 0, c.width, c.height);
	grad.addColorStop(0, "#007AC9");  // Initial path colour
	grad.addColorStop(1, "#00c972");  // End stroke colour
	ctx.strokeStyle = grad;
	ctx.fillStyle = grad;
}

function renderSparkLine(width) {
  // renderPriceLabels(minVal(priceData)*1000, maxVal(priceData)*1000);

  var spark = priceToSparkData(priceData);
  var ratioW = ( width - margin ) / spark.length;
	var ratioH = ( c.height - margin*2 ) / maxVal(spark);
  var lineWidth = 2;

	var x = 0;
	var y = 0;

  setGradiantColor(width);
	ctx.beginPath();
	ctx.lineWidth = lineWidth;
	ctx.fill();
	ctx.stroke();

	for (var index in spark) {
		x = index * ratioW;
		y = c.height - ( spark[index] * ratioH + margin );
		ctx.lineTo(x,y);
	}

	ctx.stroke();

	ctx.beginPath();
	ctx.lineWidth = lineWidth;

  // Renders live price label
  renderLivePriceLabel(y, parseFloat(priceData[priceData.length - 1]));

  // Renders blinking dot
  if (frame % 2 === 0) {
    renderDot(x, y);
  }

}

function renderUnderSparkLineFadeColor(spark, ratioW, ratioH) {
  ctx.beginPath();
  ctx.lineWidth = 0;
  for (var index in spark) {
		x = index * ratioW;
		y = c.height - ( spark[index] * ratioH + margin );
		ctx.lineTo(x,y);
	}
  ctx.lineTo(x, c.height-margin);
  ctx.lineTo(0, c.height-margin);
  ctx.lineTo(0, c.height - ( spark[0] * ratioH + margin ));

  ctx.closePath();
	var grad = ctx.createLinearGradient(0, 0, 0, c.height);
	grad.addColorStop(0, "rgba(0, 122, 201, 0.2)");  // Initial path colour
	grad.addColorStop(1, "rgba(0, 201, 114, 0)");  // End stroke colour
	// ctx.strokeStyle = grad;
	ctx.fillStyle = grad;
  ctx.fill();
}

function renderDot(x, y) {
  ctx.beginPath();
  ctx.arc(x, y, 3, 0, 2 * Math.PI);
	setGradiantColor();
  ctx.fill();
  ctx.stroke();
}

function renderPriceLabels(minPrice, maxPrice) {
  var totalPriceLabels = 5;
  var priceInterval = (maxPrice-minPrice)/totalPriceLabels;
  var price = minPrice;
  for(i = 0; i < totalPriceLabels; i++) {
    ctx.font = "12px Arial";
    ctx.fillStyle = "#747474";
    var y = c.height-margin-i*((c.height-(2*margin))/totalPriceLabels);
    ctx.fillText(price.toFixed(3), c.width-50, y);
    renderHorizontalLine(y, "#4e4e4e", 1);
    price += priceInterval;
  }
}

function renderHorizontalLine(y, color, width) {
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(c.width, y);
  ctx.strokeStyle = color;
  ctx.stroke();
}

function renderVerticalLine(x, color, width) {
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x, c.height-margin);
  ctx.strokeStyle = color;
  ctx.stroke();
}

function renderPointer(x, y) {
  renderHorizontalLine(y, "#E9E9E9", 1);
  renderVerticalLine(x, "#E9E9E9", 1);
  renderPointerPrice(y, minVal(priceData), maxVal(priceData));
}

function renderPointerPrice(y, minPrice, maxPrice) {
  ctx.font = "12px Arial";
  ctx.fillStyle = "#747474";
  price = ( (maxPrice-minPrice)*(c.height-y-margin) ) / (c.height-2*margin) + minPrice;
  ctx.fillText(price.toFixed(3), c.width-50, y);
}

var livePriceY = null;
function renderLivePriceLabel(y, price) {
  livePriceY = y;
  ctx.setLineDash([2, 2]);
  renderHorizontalLine(y, "#DDE0E4", 2);
  ctx.setLineDash([]);
  ctx.font = "12px Arial";
  ctx.fillStyle = "#747474";
  ctx.fillText(price.toFixed(3), c.width-50, y);
}

function renderTimeLabels() {

}

$("#put").hover( function() {
  // When mouse enters
  renderPutOverlay();
}, function() {
  // When mouse leaves
  refreshCanva();
});
function renderPutOverlay() {
	var grad = ctx.createLinearGradient(0, livePriceY-c.height, 0, livePriceY);
	grad.addColorStop(0, "rgba(255, 255, 255, 0)");  // Initial path colour
	grad.addColorStop(1, "rgba(0, 207, 152, 0.3)");  // End stroke colour
	// ctx.strokeStyle = grad;
	ctx.fillStyle = grad;
  ctx.fillRect(0, 0, c.width, livePriceY);
}

$("#call").hover( function() {
  // When mouse enters
  renderCallOverlay();
}, function() {
  // When mouse leaves
  refreshCanva();
});
function renderCallOverlay() {
	var grad = ctx.createLinearGradient(0, livePriceY, 0, livePriceY+c.height);
	grad.addColorStop(0, "rgba(255, 50, 0, 0.3)");  // Initial path colour
	grad.addColorStop(1, "rgba(0, 122, 201, 0)");  // End stroke colour
	// ctx.strokeStyle = grad;
	ctx.fillStyle = grad;
  ctx.fillRect(0, livePriceY, c.width, c.height);
}
