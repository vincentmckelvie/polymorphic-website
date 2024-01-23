import * as THREE from './build/three.module.js';
import { EffectComposer } from './scripts/jsm/postprocessing/EffectComposer.js';
import { ShaderPass } from './scripts/jsm/postprocessing/ShaderPass.js';
import { RenderPass } from     './scripts/jsm/postprocessing/RenderPass.js';

import { UnrealBloomPass } from'./scripts/jsm/postprocessing/UnrealBloomPass.js';
import { RGBShiftShader } from './scripts/jsm/shaders/RGBShiftShader.js';
import { KTX2Loader } from './scripts/jsm/loaders/KTX2Loader.js';
import { BrightnessContrastShader } from './scripts/jsm/shaders/BrightnessContrastShader.js';
import { HueSaturationShader } from './scripts/jsm/shaders/HueSaturationShader.js';
import { OrbitControls } from './scripts/jsm/controls/OrbitControlsBACKUP.js';
import { GLTFLoader } from './scripts/jsm/loaders/GLTFLoader.js';
import { TWEEN } from './scripts/jsm/libs/tween.module.min.js';
import { MeshoptDecoder } from './scripts/jsm/libs/meshopt_decoder.module.js';

let renderer, camera, scene, controls, composer, bloomPass, hue = Math.random(), model, mixer, raycaster, point, rawPoint, drawObject, loadingHelper, manager;
let index = 0;
const meshes=[];
const mouse = {
  x:0,
  y:0,
  down:false,
  moved:false,
  first:false,
  touchMult:0,
  touchTarg:0, 
  touching:false,
}
const clock = new THREE.Clock();
let mylatesttap;
let lastCamPos = new THREE.Vector3();


init();

function init() {
  /*
  document.getElementById("info").addEventListener("pointerdown", function(){
    const p = {y:-600};
    new TWEEN.Tween(p) // Create a new tween that modifies 'coords'.
    .to({ y:0}, 750) // Move to (300, 200) in 1 second.
    .easing(TWEEN.Easing.Exponential.Out) // Use an easing function to make the animation smooth.
    .onUpdate(() => {
      document.getElementById("credits-instructions").style.bottom = p.y+"px";
    })
    .start()

  })
  
  document.getElementById("bottom").addEventListener("pointerdown", function(){
    
    const p = {y:0};
    new TWEEN.Tween(p) // Create a new tween that modifies 'coords'.
    .to({ y:-600}, 750) // Move to (300, 200) in 1 second.
    .easing(TWEEN.Easing.Exponential.In) // Use an easing function to make the animation smooth.
    .onUpdate(() => {
       document.getElementById("credits-instructions").style.bottom = p.y+"px";
    })
    .start()
  })
  
  document.getElementById("refresh").addEventListener("pointerdown", function(){
    //controls.reset();
    location.reload();
  })
  */
  rawPoint = new THREE.Vector3();
  point = new THREE.Vector3();
  camera = new THREE.PerspectiveCamera( 30, window.innerWidth / window.innerHeight, 1, 1000 );
  camera.position.z = 40;

  scene = new THREE.Scene();
  const near = 1;
  const far = 400;
  const color = new THREE.Color().setHSL((hue+.5)%1.0, .5, .01);
  //scene.fog = new THREE.Fog(color, near, far);
  scene.fog = new THREE.FogExp2(color, .001);
  scene.background = new THREE.Color(color);
  //scene.fog = new THREE.Fog( 0xffffff, 0,400 );
  
  renderer = new THREE.WebGLRenderer( { antialias: true } );
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( window.innerWidth, window.innerHeight );
  renderer.shadowMap.enabled = true;

  renderer.domElement.style.touchAction = 'none';
    
  document.body.appendChild( renderer.domElement );

  const renderScene = new RenderPass( scene, camera );
 
  //bloomPass = new UnrealBloomPass( new THREE.Vector2( window.innerWidth * window.devicePixelRatio, window.innerHeight * window.devicePixelRatio ), 1.8, .001, 0.1 );
  //bloomPass = new UnrealBloomPass( new THREE.Vector2( window.innerWidth*.15, window.innerHeight*.15 ), .26, .001, 0.5 );
  composer = new EffectComposer( renderer );
  composer.addPass( renderScene );
  //composer.addPass( bloomPass );
  
  raycaster = new THREE.Raycaster();

  // const rbgShift = new ShaderPass( RGBShiftShader );
  // rbgShift.uniforms[ 'amount' ].value = 0.000;
  // //this.rbgShift.addedToComposer = false;
  // //composer.addPass( rbgShift );

  const brtCont = new ShaderPass( BrightnessContrastShader );
  composer.addPass(brtCont);

  const huefx = new ShaderPass( HueSaturationShader );
  composer.addPass(huefx)

  huefx.uniforms[ 'saturation' ].value = .24;// parseFloat(event.target.value);
  brtCont.uniforms[ 'contrast' ].value = .1;
  brtCont.uniforms[ 'brightness' ].value = .1;

  controls = new OrbitControls( camera, renderer.domElement );
  //controls.autoRotate = true;
  //controls.autoRotateSpeed = 2.0; // 3
  //controls.listenToKeyEvents( window ); // optional

  window.addEventListener( 'resize', onWindowResize );
  document.addEventListener( 'pointermove', onPointerMove );
  document.addEventListener( 'pointerdown', onPointerDown );
  document.addEventListener( 'pointerup', onPointerUp );
  
  const light = new THREE.AmbientLight( 0xbbbbbb ); // soft white light
  scene.add( light );

  const dirLight = new THREE.DirectionalLight( 0xffffff, 3 );
  dirLight.position.set( - 3, 10,  10 );
  dirLight.castShadow = true;
  dirLight.shadow.camera.top = 5;
  dirLight.shadow.camera.bottom = -5;
  dirLight.shadow.camera.left = - 5;
  dirLight.shadow.camera.right = 5;
  dirLight.shadow.camera.near = 0.1;
  dirLight.shadow.camera.far = 40;
  scene.add( dirLight );
  
  /*
  manager = new THREE.LoadingManager();
  manager.onProgress = function ( url, itemsLoaded, itemsTotal ) {
    if(loadingHelper)
      loadingHelper.update(loadingHelper, false);
    //console.log( 'Loading file: ' + url + '.\nLoaded ' + itemsLoaded + ' of ' + itemsTotal + ' files.' );
  };

  const loader = new GLTFLoader(manager).setPath( "./extras/" );
  loader.load("loading.glb", function(gltf){

    const children = [];
    let parent;
    const scn = gltf.scene;
    scene.add(scn);
    
    gltf.scene.traverse(function(obj){
      if(obj.isMesh && obj.name != "loading"){
        obj.castShadow = true;
        obj.receiveShadow = true;
        obj.material.emissiveIntensity = 0;//new THREE.Color(0xffffff)
        children.push(obj)
      }
      if(obj.name=="parent"){
        parent = obj;
      }
    })

    loadingHelper = new LoadingAnimation({children:children, parent:parent, scn:scn})
    
    setTimeout(handleLoadModel,1000);
    */
    const ktx2Loader = new KTX2Loader()
    .setTranscoderPath( './scripts/jsm/libs/basis/' )
    .detectSupport( renderer );

  // const loader = new GLTFLoader();
  // loader.setKTX2Loader( ktx2Loader );
  // loader.setMeshoptDecoder( MeshoptDecoder );
  // loader.load( './extras/untitled.glb', function ( gltf ) {

  //   const gltfScene = gltf.scene;
  //   gltfScene.position.y = - .8;
  //   gltfScene.scale.setScalar( .01 );

  //   scene.add( gltfScene );
  //   animate();

  // } );

  const loader = new GLTFLoader().setPath( '' );
				loader.setKTX2Loader( ktx2Loader );
				loader.setMeshoptDecoder( MeshoptDecoder );
				loader.load( './extras/head.glb', function ( gltf ) {

					// coffeemat.glb was produced from the source scene using gltfpack:
					// gltfpack -i coffeemat/scene.gltf -o coffeemat.glb -cc -tc
					// The resulting model uses EXT_meshopt_compression (for geometry) and KHR_texture_basisu (for texture compression using ETC1S/BasisLZ)

					gltf.scene.position.y = 8;

					scene.add( gltf.scene );

					
          animate();
				} );

    
  //});

  

  // drawObject = new THREE.Object3D();
  // scene.add(drawObject);
  // const m = new THREE.Mesh(new THREE.BoxGeometry(10,17,.2), new THREE.MeshBasicMaterial({visible:false,color:0xffffff}))
  // drawObject.add(m);
  
  

}


function handleLoadModel(){
 
  
  
  // manager.onStart = function ( url, itemsLoaded, itemsTotal ) {
  //   console.log( 'Started loading file: ' + url + '.\nLoaded ' + itemsLoaded + ' of ' + itemsTotal + ' files.' );
  // };

 

  const loader2 = new GLTFLoader(manager).setPath( "./extras/" );
  loader2.load( 'draw.glb', function ( gltf ) {
    drawObject = gltf.scene;
    scene.add(drawObject);
    drawObject.traverse(function(obj){
      if(obj.isMesh){
        obj.material.visible = false;
      }
    });
  });

  const loads = ["untitled","minimal","mother","gradient", "everything-human-12for-glb", "gradient-rock-plants-7"];
  loader2.load( loads[ Math.floor( Math.random()*loads.length) ]+'.glb', function ( gltf ) {
  //loader2.load( 'gradient-3.glb', function ( gltf ) {
  //loader2.load( 'everything-human-12for-glb.glb', function ( gltf ) {
  //loader2.load( 'gradient.glb', function ( gltf ) {
      //
      //document.getElementById("loading").style.display = "none"; 
      loadingHelper.kill();
      model = gltf.scene;
      
      mixer = new THREE.AnimationMixer( model );
      //const action = mixer.clipAction( gltf.animations[0] );
      
      for(let i = 0; i<gltf.animations.length; i++){
        const action = mixer.clipAction( gltf.animations[i] );
        action.play();
      }
      ///action.play();
      model.traverse(function(obj){
        if(obj.isMesh){
          //console.log(obj.name)
          obj.castShadow = true;
          obj.receiveShadow = true;
          obj.material.emissiveIntensity = 0;//new THREE.Color(0xffffff)
          meshes.push(new PaintMesh( {mesh:obj, index:index} ))
          index++;
        }
      })
  
      scene.add(model);

      setTimeout(function(){
        const p = {y:0};
        new TWEEN.Tween(p) // Create a new tween that modifies 'coords'.
        .to({ y:1}, 750) // Move to (300, 200) in 1 second.
        .easing(TWEEN.Easing.Linear.None) // Use an easing function to make the animation smooth.
        .onUpdate(() => {
          document.getElementById("ui-holder").style.display="block";
          document.getElementById("ui-holder").style.opacity = p.y;
        })
        .start()
      }, 200);

      animate();
    
     
  
    });
}


function onPointerMove(e){
  mouse.moved = true;
  handleInteraction(e);
  if(!controls.enabled)
    handleMeshInteraction(false);
  
}

function handleInteraction(e){
  
  let x = 0; 
  let y = 0;

  if(e.touches != null){
      var touch = e.touches[0];
      x = touch.pageX;
      y = touch.pageY;
  }else{
      x = e.clientX;
      y = e.clientY;
  }
 
  mouse.x = -1+((x/window.innerWidth)*2);
  mouse.y = (-1+((y/window.innerHeight)*2))*-1;

}

function handleMeshInteraction(isPointerDown){

  if(model != null && mouse.down && drawObject!=null ){

    raycaster.setFromCamera( new THREE.Vector2(mouse.x, mouse.y), camera);
    const intersects = raycaster.intersectObjects( drawObject.children, true );
    
    if ( intersects.length > 0 ) {
  //    console.log(intersects[0])
      if(mouse.moved){
        mouse.touching = true;
        mouse.first = true;
        rawPoint.copy(intersects[0].point);
      }

      if(isPointerDown){
        controls.enabled = false;
      }
      
      //
      
    }else{
      mouse.touching = false;
    }

  }
}
 
function doubleTap() {

  const now = new Date().getTime();
  const timesince = now - mylatesttap;
  
  if((timesince < 300) && (timesince > 0)){
    const d = camera.position.distanceTo(lastCamPos);  
    if(d<2)
      controls.reset();
  }

  lastCamPos.copy(camera.position);
  mylatesttap = new Date().getTime();

}

function onPointerDown(e){
  mouse.down = true;
  //doubleTap();
  handleInteraction(e);
  handleMeshInteraction(true);
}

function onPointerUp(e){
  mouse.down = false;
  controls.enabled = true;
}

function clamp(num, neg, pos){
  let n = num;
  if(num>pos)n = pos;
  if(num<neg)n=neg;
  return n;
}

function onWindowResize() {

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
 
  renderer.setSize( window.innerWidth, window.innerHeight );
  composer.setSize( window.innerWidth, window.innerHeight );

}
let iSize = 0, iInc = Math.random()*200, iSpeed = .4+Math.random()*1; 
function animate() {
  TWEEN.update();
  requestAnimationFrame( animate );
  
  camera.updateMatrixWorld();
  
  const delta = clock.getDelta();

  // if(loadingHelper)
  //   loadingHelper.update({delta:delta});


  if(mixer!=null)
    mixer.update( delta );
  
  
  iInc += delta * iSpeed;
  
  if(mouse.touching && mouse.down){
    mouse.touchTarg = 1;
  }else{
    mouse.touchTarg = 0;
  }
  
  mouse.touchMult += (mouse.touchTarg-mouse.touchMult)*(delta*2.2);
  
  if(mouse.first){
    //iSize = (2.0 + ((.5+(Math.sin(iInc)*.5))*1.2))*mouse.touchMult;
    iSize = (4)*mouse.touchMult;
  }
  
  
  point.lerp(rawPoint,.2)
  
  for(let i = 0; i<meshes.length; i++){
    meshes[i].update({delta:delta});
  }

  controls.update();
  composer.render();
  mouse.moved = false;
  
}

class PaintMesh{
  
  constructor(OBJ){
    this.mesh = OBJ.mesh;
   
    this.sub = new THREE.Vector3();
    this.og = new THREE.Vector3().copy(this.mesh.position);
    //this.fnl = new THREE.Vector3()
    
    this.wp = new THREE.Vector3();
    this.mesh.getWorldPosition(this.wp);
    const m = this.mesh.material.clone();
    this.mesh.material = buildCustomMaterial(m, this.wp);
    this.intro = (OBJ.index*-1)*.00021;
    this.i = OBJ.index;
  }

  update(OBJ){
   
    
    //this.mesh.updateMatrixWorld();
    this.mesh.getWorldPosition(this.wp);
    const sub = new THREE.Vector3().subVectors(point, this.wp);//this.wp, point);
    //console.log(sub)
    
    sub.normalize();

    let dist = point.distanceTo(this.wp);
    if(dist > iSize){
      dist = iSize;
    }
    
    const s = ((iSize-dist)*.4);
    
    sub.multiplyScalar(s);

    const shader = this.mesh.material.userData.shader;
    if ( shader ) {
      if(shader.uniforms.offset==null || shader.uniforms.intro==null)
        return;
      this.intro += OBJ.delta * .4;
      let introOne = this.intro;
      if(introOne<0)introOne = 0;
      if(introOne>1)introOne = 1;
      let intro = Math.sin( ( -.5+introOne ) * (3.14*1.66) ) * 2;
      if(intro<0)intro = 0;
      shader.uniforms.offset.value = sub;
      shader.uniforms.intro.value = intro;

    }

  }
}

function buildCustomMaterial( material, start ) {

  material.onBeforeCompile = function ( shader ) {

    shader.uniforms.offset = { value: new THREE.Vector3() };
    shader.uniforms.worldStart = { value: start };
    shader.uniforms.intro = { value: 0 };

    shader.vertexShader = 'uniform vec3 offset;\n' + 'uniform float intro;\n' + 'uniform vec3 worldStart;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      [
        'vec4 worldFour = vec4(modelMatrix * vec4(position, 1.0));',
        'vec3 world = worldStart;',//vec3(worldStart);
        //'vec4 centerOff = vec4(modelMatrix * vec4(position, 1.0));',
        'vec3 transformed = vec3(  (position * intro)   ) + (world * ((1.0-intro)*.2) ) + offset;',
        //'vec3 transformed = vec3(  (position)   )  + offset;',
        
      ].join( '\n' )
    );

    material.userData.shader = shader;

  };


  return material;

}



class LoadingAnimation{
  constructor(OBJ){
    const self = this;
    this.scn = OBJ.scn;
    this.parent = OBJ.parent;
    this.children = OBJ.children;
    this.inc = 0;
    this.killed = false;
    const s = 5;
    this.scn.scale.set(s,s,s);
    self.hideAll();
    this.ii = 0;
    this.children[ this.ii].visible = true;
    controls.update();
    composer.render();
    setTimeout(function(){
      self.update(self, true)
    }, 100);
  }
  update(self, shouldLoop){
    //console.log(self)
    self.hideAll();
    self.children[ self.ii].visible = true;
    self.ii++;
    self.ii = self.ii % self.children.length;
    controls.update();
    composer.render();
    
    if(shouldLoop){
      setTimeout(function(){
        self.updateHelper(self)
      }, 100);
    }
     
  }

  updateHelper(self){
    
    if(!self.killed){
      self.update(self,true)
    }
  }

  hideAll(){

    for(let i = 0; i<this.children.length; i++){
      this.children[i].visible = false;
    }
    
  }

  kill(){
    this.killed = true;
    scene.remove(this.scn);
    this.hideAll();
  }
  

}