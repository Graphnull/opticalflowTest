let sharp = require('sharp');
let fs = require('fs');
let images = ['i1.png',
'i2.png',
'i3.png'];

let width = 300;
let height = 225;
let scale = 4;
class Image {
    constructor(img, inwidth, inheight, channels){
        
            this.data= img
            this.width = inwidth || width;
            this.height = inheight || height;
            this.channels = channels ||3
        //this.data= new Uint8Array(imgOrWidth*height*3);
    }
    for(func, params={}){
        let {offsetx,offsety, cw,ch} = params;
        offsety = offsety || 0;
        offsetx = offsetx || 0;
        for(let y = offsety;y<(ch||this.height)+offsety;y++){
            for(let x = offsetx;x<(cw||this.width)+offsetx;x++){
                let i = y*this.width*this.channels+x*this.channels
                func(i, this.data, x,y)
            }
        }
    }
    conv2d(image1, convWidth, convStart, convOptions={}){
        let out = (new Array(convWidth*convWidth)).fill(0);
        for(let y=convStart;y<(convWidth+convStart);y++){
            
            for(let x =convStart;x<(convWidth+convStart);x++){
                let offset = y*this.width*this.channels+x*this.channels
                let dist = 0;
                this.for((i, data)=>{
                        dist+=Math.sqrt(
                            (data[i+0]-(image1.data[i+offset+0]||500))**2+
                            (data[i+1]-(image1.data[i+offset+1]||500))**2+
                            (data[i+2]-(image1.data[i+offset+2]||500))**2
                        )/256;
                }, convOptions)
                out[(y-convStart)*convWidth + (x-convStart)]=dist/((convOptions.cw||this.width)*(convOptions.ch||this.height))
            }
        }

        return new Image(out, convWidth, convWidth);
    }
    move(img){
        let nImg = new Buffer(this.data.length)
        for(let y=0;y!==this.height;y++){
            for(let x =0;x!==this.width;x++){
                let c = this.channels;
                let i = y*this.width*c+x*c
                let ii = y*this.width*2+x*2
                let xoffset = img.data[ii+0]
                let yoffset = img.data[ii+1]
                nImg[i+0]=this.data[i+0+yoffset*this.width*c+xoffset*c]
                nImg[i+1]=this.data[i+1+yoffset*this.width*c+xoffset*c]
                nImg[i+2]=this.data[i+2+yoffset*this.width*c+xoffset*c]
            }
        }
        this.data= nImg
    }
    minPoint(){
        let minV = Math.min(...this.data); 
        let avgx=0;
        let avgy=0;
        let count =0;
        for(let y=0;y!==this.height;y++){
            for(let x =0;x!==this.width;x++){
                let i = x + y * this.width;
                let n = this.data[i];
                if(n===minV){
                    avgx+=(x-20)
                    avgy+=(y-20)
                    count++;
                }
            }
        }
        avgx=avgx/count;
        avgy=avgy/count;
        return [avgx, avgy]
    }
    save(name){
        return sharp(this.data,{raw:{width:this.width,height:this.height,channels:3}}).png().toFile(name)
    }
    clone(){
        return new Image(this.data, this.width, this.height, this.channels)
    }
}

(async ()=>{
    let image1 = new Image(await sharp(images[0]).raw().removeAlpha().resize(width, height).toBuffer());
    let image2 = new Image(await sharp(images[1]).raw().removeAlpha().resize(width, height).toBuffer());

    for(let scale =1;scale!==256;scale*=2){
        let offsetImage = new Image(new Int16Array(width*height*2), width, height,2)
        let hw = (width/scale)|0
        let hh = (height/scale)|0
        console.log(scale);
        for(let iy=0;iy!==scale;iy++){
            for(let ix=0;ix!==scale;ix++){
                let out2 = image2.conv2d(image1, 40, -20,{offsetx:hw*ix,offsety:hh*iy, cw:hw, ch:hh});
                let [avgx2, avgy2] = out2.minPoint()
                offsetImage.for((i, data, x,y)=>{
                    if(x>(hw*ix)&&x<hw+(hw*ix) && y>(hh*iy) && y<hh+(hh*iy)){
                        data[i+0]-=Math.floor(avgx2);
                        data[i+1]-=Math.floor(avgy2);
                    }
                })
            }
        }
        image2.move(offsetImage);
        image2.save('./2to1_s'+scale+'.png');
    }
    

})()
