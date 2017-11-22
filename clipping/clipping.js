/**
 * Created by liyongleihf2006
 * 
 * 裁剪图片组件
 * params:
 *      options:{
 *           ele:element  生成裁剪图片组件的元素  
 *           targetShape:"rect" or "circle",default:"rect" 目标图像的形状(只支持圆形:circle和矩形:rect)
 *           targetWidth:number default:canvas的宽度 当targetShape为rect时导出的图片数据的图片源宽度
 *           targetHeight:number default:canvas的高度 当targetShape为rect时导出的图片数据的图片源高度
 *           targetR:number default:canvas的宽度和高度中的小值 当targetShape为circle时导出的图片数据的图片源的半径
 *           shouldDropIn:boolean  源图片是否可以通过拖拽来放入canvas  
 *           shouldDblclickIn:boolean 源图片是否可以通过双击canvas来放入canvas
 *           shouldMouseDrag:boolean 图片移动是否可以通过鼠标拖拽来进行
 *           shouldMouseWheelScale:boolean 图片放大缩小是否可以通过鼠标滑轮来进行
 *           shouldKeystrokeMovement:boolean 图片移动是否可以通过上下左右按键来进行
 *           maskColor:string default:rgba(0,0,0,.5) 遮罩的颜色
 *      }
 * methods:
 *      isPaintingFinished() 是否导入的图片绘制完毕
 *      incomingImage(file) 传入图像文件
 *                    file 传入的图像文件数据,一般是input[type=file]中的files[0]
 *      scaling(value) 缩放图片
 *              value:number 缩放的大小,单位是像素 
 *      moving(x,y) 移动图片
 *            x:number x轴移动的像素,单位是像素
 *            y:number y轴移动的像素,单位是像素
 *      toDataURL(type,encoderOptions)
 *                type:string 图片格式，默认为 image/png ,可使用的值有:"image/png","image/jpeg","image/webp"等
 *                encoderOptions:string 可选,在指定图片格式为 image/jpeg 或 image/webp的情况下，可以从 0 到 1 的区间内选择图片的质量。如果超出取值范围，将会使用默认值 0.92。其他参数会被忽略。
 */ 
function Clipping(options){
    //是否绘画完毕的状态
    var paintingFinished=false;
    //生成裁剪图片组件的元素
    var target = options.ele;
    if(!target){
        throw new Error("the ele is required");
    };
    //源图片是否可以通过拖拽来放入canvas
    var shouldDropIn = options.shouldDropIn;
    //源图片是否可以通过双击canvas来放入canvas
    var shouldDblclickIn = options.shouldDblclickIn;
    //图片移动是否可以通过鼠标拖拽来进行
    var shouldMouseDrag = options.shouldMouseDrag;
    //图片放大缩小是否可以通过鼠标滑轮来进行
    var shouldMouseWheelScale = options.shouldMouseWheelScale;
    //图片移动是否可以通过上下左右按键来进行
    var shouldKeystrokeMovement = options.shouldKeystrokeMovement;
    //目标图像的形状(只支持圆形:circle和矩形:rect)默认是rect
    var targetShape = options.targetShape||"rect";
    if(targetShape!=="rect"&&targetShape!=="circle"){
        throw new Error("this mask shape is not supported");
    }
    //遮罩的颜色,默认为:rgba(0,0,0,.5)
    var maskColor = options.maskColor||"rgba(0,0,0,.5)";
    //canvas的当前样式
    var computedStyle=window.getComputedStyle(target);
    //canvas的宽度
    var canvasWidth = parseFloat(computedStyle.width);
    //canvas的高度
    var canvasHeight = parseFloat(computedStyle.height);
    //当targetShape为rect时导出的图片数据的图片源宽度(不传入的时候默认为canvas的宽度)
    var targetWidth = options.targetWidth||canvasWidth;
    //当targetShape为rect时导出的图片数据的图片源高度(不传入的时候默认为canvas的高度)
    var targetHeight = options.targetHeight||canvasHeight;
    //当targetShape为circle时导出的图片数据的图片源的半径(不传入的时候默认为canvas的宽度和高度中的小值)
    var targetR = options.targetR||Math.min(canvasWidth,canvasHeight)/2;
    //渲染的图片的宽度
    var imageWidth;
    //渲染的图片的高度
    var imageHeight;
    //图片的位置
    var imageX=0;
    var imageY=0;
    //鼠标是否按下的标记(当鼠标按下的时候鼠标移动才会导致图片移动) 
    var mousedown=false;
    //鼠标点击后当前鼠标的位置
    var currentX=0;
    var currentY=0;

    //获取canvas的绘图环境
    var ctx = target.getContext('2d');
    //初始化的时候将遮罩画入
    ctx.drawImage(drawMask(),0,0);
    if(shouldDblclickIn){
        target.addEventListener("dblclick",function(){
            var input = document.createElement("input");
            input.type="file";
            input.accept="image/*";
            input.addEventListener("change",function(event){
                var file=this.files[0];
                incomingImage(file);
            });
            input.click();
        })
    }
    if(shouldDropIn){
        target.addEventListener("dragover",function(event){
            //ondragover中必须阻止事件的默认行为，默认地，无法将数据/元素放置到其他元素中。
            event.preventDefault();
        });
        target.addEventListener("drop",function(event){
            event.preventDefault();
            //拿到拖入的文件  
            var file = event.dataTransfer.files[0];
            incomingImage(file);
        });
    }
    if(shouldMouseWheelScale){
        target.addEventListener("wheel",function(event){
            event.preventDefault();
            scaling(event.deltaY);
        })
    }
    if(shouldMouseDrag){
        target.addEventListener("mousedown",function(event){
            currentX = event.clientX;
            currentY = event.clientY;
            mousedown=true;
        })
        target.addEventListener("mousemove",function(event){
            if(mousedown){
                var clientX = event.clientX;
                var clientY = event.clientY;
                //赋值图片当前的x,y
                moving(clientX - currentX,clientY - currentY);
                currentX = clientX;
                currentY = clientY;
            }
        })
        window.addEventListener("mouseup",function(){
            mousedown=false;
            currentX=0;
            currentY=0;
            moveXLength=0;
            moveYLength=0;
        });
        
    }
    if(shouldKeystrokeMovement){
        //注意:当支持上下左右按键移动图片的时候,canvas的outline设置为了none
        target.setAttribute("tabindex","0");
        target.style.outline="none";
        target.addEventListener("keydown",function(event){
            event.preventDefault();
            switch(event.keyCode){
                case 38:moving(0,-1);break;
                case 40:moving(0,1);break;
                case 37:moving(-1,0);break;
                case 39:moving(1,0);break;
            }
        });
    }
    
    
    var image = new Image();
    var oFReader = new FileReader();
    var rFilter = /^(?:image\/bmp|image\/cis\-cod|image\/gif|image\/ief|image\/jpeg|image\/jpeg|image\/jpeg|image\/pipeg|image\/png|image\/svg\+xml|image\/tiff|image\/x\-cmu\-raster|image\/x\-cmx|image\/x\-icon|image\/x\-portable\-anymap|image\/x\-portable\-bitmap|image\/x\-portable\-graymap|image\/x\-portable\-pixmap|image\/x\-rgb|image\/x\-xbitmap|image\/x\-xpixmap|image\/x\-xwindowdump)$/i;
    image.addEventListener("load",function(){
        //图片的原始宽度
        var originWidth = image.width;
        //图片的原始高度
        var originHeight = image.height;
        //如果图片的原始宽度和原始高度均小于等于canvas的宽度和高度
        //那么图片以原始大小渲染到画布上面去
        //如果图片的原始宽度和原始高度的比例大于canvas的宽度和高度的比例
        //那么渲染的图片宽度等于canvas的宽度,高度同比率缩放
        //如果图片的原始宽度和原始高度的比例小于canvas的宽度和高度的比例
        //那么渲染的图片高度等于canvas的高度,宽度同比率缩放
        //图片的默认高度(默认高度为根据canvas同比率缩放后的高度)
        if(originWidth<=canvasWidth&&originHeight<=canvasHeight){
            imageWidth = originWidth;
            imageHeight = originHeight;
        }else if(originWidth/originHeight>=canvasWidth/canvasHeight){
            imageWidth = canvasWidth;
            imageHeight = imageWidth*(originHeight/originWidth);
        }else{
            imageHeight = canvasHeight;
            imageWidth = imageHeight*(originWidth/originHeight);
        }
        //图片要在canvas中居中显示
        imageX = (canvasWidth - imageWidth)/2;
        imageY = (canvasHeight - imageHeight)/2;
        drawImage();
    });
    oFReader.onload = function (oFREvent) {
        image.src = oFREvent.target.result;
    };
    return {
        //是否绘制完毕
        //return boolean
        isPaintingFinished:isPaintingFinished,
        //传入图像文件
        //params:
        //file 传入的图像文件数据,一般是input[type=file]中的files[0]
        incomingImage:incomingImage,
        //缩放操作
        //params:
        //value:number 缩放的大小,单位是像素
        scaling:scaling,
        //移动操作
        //params:
        //x:number x轴移动的像素,单位是像素
        //y:number y轴移动的像素,单位是像素
        moving:moving,
        //生成图片的base64
        //params:
        //type:图片格式，默认为 image/png ,可使用的值有:"image/png","image/jpeg","image/webp"等
        //encoderOptions 可选,在指定图片格式为 image/jpeg 或 image/webp的情况下，可以从 0 到 1 的区间内选择图片的质量。如果超出取值范围，将会使用默认值 0.92。其他参数会被忽略。
        toDataURL:toDataURL
    }
    //是否绘制完毕
    function isPaintingFinished(){
        return paintingFinished;
    }
    //移动操作
    function moving(x,y){
        imageX +=x;
        imageY +=y;
        drawImage();
    }
    //缩放操作
    function scaling(value){
        imageHeight += value;
        imageWidth += value;
        imageX -= value/2;
        imageY -= value/2;
        drawImage();
    }
    //传入图片
    function incomingImage(file){
        if (!file||!rFilter.test(file.type)) { 
            return;
        }
        //绘画完毕状态设置为false
        paintingFinished=false;
        oFReader.readAsDataURL(file);
        target.style.cursor = "pointer";
    }
    //绘制图像
    function drawImage(){
        ctx.clearRect(0,0,canvasWidth,canvasHeight);
        ctx.drawImage(image, imageX, imageY,imageWidth,imageHeight);
        ctx.drawImage(drawMask(),0,0);
        //绘画完毕状态设置为true
        paintingFinished=true;
    }
    //绘制遮罩
    function drawMask(){
        var mask = document.createElement("canvas");
        mask.width = canvasWidth;
        mask.height = canvasHeight;
        var ctx = mask.getContext("2d");
        ctx.beginPath(); 
        if(targetShape==="rect"){
            var x = (canvasWidth - targetWidth)/2;
            var y = (canvasHeight - targetHeight)/2;
            ctx.rect(x,y,targetWidth,targetHeight);
        }else if(targetShape==="circle"){
            var cx = canvasWidth/2;
            var cy = canvasHeight/2;
            ctx.arc(cx, cy,targetR, 0, Math.PI * 2); 
        }
        ctx.closePath(); 
        ctx.fill(); 
        ctx.globalCompositeOperation = 'source-out';
        ctx.fillStyle = maskColor; 
        ctx.beginPath(); 
        ctx.rect(0, 0, canvasWidth, canvasHeight);
        ctx.closePath(); 
        ctx.fill();
        return mask; 
    }
    //导出图片
    function toDataURL(type,encoderOptions){
        var canvas = document.createElement("canvas");
        if(targetShape === "rect"){
            canvas.width = targetWidth;
            canvas.height = targetHeight;
        }else if(targetShape === "circle"){
            canvas.width = targetR*2;
            canvas.height = targetR*2;
        }
        var ctx = canvas.getContext("2d");
        if(targetShape === "rect"){
            //因为目标canvas要比原来canvas小,因此放入的image的坐标要去掉原canvas与目标canvas的宽高差值的一半
            var x =imageX - (canvasWidth - targetWidth)/2;
            var y =imageY - (canvasHeight - targetHeight)/2;
        }else if(targetShape === "circle"){
            //进行一下裁剪
            ctx.arc(targetR,targetR,targetR,0,Math.PI*2);
            ctx.clip();
            //因为目标canvas要比原来canvas小,因此放入的image的坐标要去掉原canvas高宽的一半减去targetR
            var x =imageX - (canvasWidth/2 - targetR);
            var y =imageY - (canvasHeight/2 - targetR);
        }
        ctx.drawImage(image,x,y,imageWidth,imageHeight);
        return canvas.toDataURL(type,encoderOptions);
    }
}