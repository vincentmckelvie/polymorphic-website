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
import { OutlineEffect } from './scripts/jsm/effects/OutlineEffect.js';

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
let outlineEffect;

init();

function init() {
  
  rawPoint = new THREE.Vector3();
  point = new THREE.Vector3();
  camera = new THREE.PerspectiveCamera( 30, window.innerWidth / window.innerHeight, 1, 1000 );
  camera.position.z = 40;

  scene = new THREE.Scene();
  const near = 1;
  const far = 400;
  const color = new THREE.Color().setHSL(0, 0, 1);
  //scene.fog = new THREE.Fog(color, near, far);
  //scene.fog = new THREE.FogExp2(color, .001);
  //scene.background = new THREE.Color(color);
  //scene.fog = new THREE.Fog( 0xffffff, 0,400 );
  
  renderer = new THREE.WebGLRenderer( { antialias: true, alpha: true  } );
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( window.innerWidth, window.innerHeight );
  renderer.shadowMap.enabled = true;

  renderer.domElement.style.touchAction = 'none';
    
  document.body.appendChild( renderer.domElement );

  //const renderScene = new RenderPass( scene, camera );
 
  //bloomPass = new UnrealBloomPass( new THREE.Vector2( window.innerWidth * window.devicePixelRatio, window.innerHeight * window.devicePixelRatio ), 1.8, .001, 0.1 );
  //bloomPass = new UnrealBloomPass( new THREE.Vector2( window.innerWidth*.15, window.innerHeight*.15 ), .26, .001, 0.5 );
  //composer = new EffectComposer( renderer );
  //composer.addPass( renderScene );
  //composer.addPass( bloomPass );
  
  raycaster = new THREE.Raycaster();

  // const rbgShift = new ShaderPass( RGBShiftShader );
  // rbgShift.uniforms[ 'amount' ].value = 0.000;
  // //this.rbgShift.addedToComposer = false;
  // //composer.addPass( rbgShift );

  // const brtCont = new ShaderPass( BrightnessContrastShader );
  // composer.addPass(brtCont);

  // const huefx = new ShaderPass( HueSaturationShader );
  // composer.addPass(huefx)

  // huefx.uniforms[ 'saturation' ].value = .24;// parseFloat(event.target.value);
  // brtCont.uniforms[ 'contrast' ].value = .1;
  // brtCont.uniforms[ 'brightness' ].value = .1;

  outlineEffect = new OutlineEffect( renderer );

  controls = new OrbitControls( camera, renderer.domElement );
  //controls.autoRotate = true;
  //controls.autoRotateSpeed = 2.0; // 3
  //controls.listenToKeyEvents( window ); // optional

  window.addEventListener( 'resize', onWindowResize );

  
  const light = new THREE.AmbientLight( 0xffffff ); // soft white light
  scene.add( light );

  const dirLight = new THREE.DirectionalLight( 0xffffff, 1 );
  dirLight.position.set( 1, 1,  1 );
  dirLight.castShadow = true;
  dirLight.shadow.camera.top = 5;
  dirLight.shadow.camera.bottom = -5;
  dirLight.shadow.camera.left = - 5;
  dirLight.shadow.camera.right = 5;
  dirLight.shadow.camera.near = 0.1;
  dirLight.shadow.camera.far = 40;
  scene.add( dirLight );

  

  const cubeWidth = 400;
  const numberOfSphersPerSide = 0;
  const sphereRadius = ( cubeWidth / numberOfSphersPerSide ) * 0.8 * 0.5;
  const stepSize = 1.0 / numberOfSphersPerSide;
  const format = ( renderer.capabilities.isWebGL2 ) ? THREE.RedFormat : THREE.LuminanceFormat;
  let gradientMap;
  for ( let alpha = 0, alphaIndex = 0; alpha <= 1.0; alpha += stepSize, alphaIndex ++ ) {

    const colors = new Uint8Array( alphaIndex + 2 );

    for ( let c = 0; c <= colors.length; c ++ ) {

      colors[ c ] = ( c / colors.length ) * 256;

    }

    gradientMap = new THREE.DataTexture( colors, colors.length, 1, format );
    gradientMap.needsUpdate = true;
    
  }

    const ktx2Loader = new KTX2Loader()
    .setTranscoderPath( './scripts/jsm/libs/basis/' )
    .detectSupport( renderer );

  const cubeMap = new THREE.CubeTextureLoader();
  cubeMap.setPath( './extras/cube/Bridge2/' );

  const textureCube = cubeMap.load( [ 'posx.jpg', 'negx.jpg', 'posy.jpg', 'negy.jpg', 'posz.jpg', 'negz.jpg' ] );

  const loader = new GLTFLoader().setPath( '' );
    loader.setKTX2Loader( ktx2Loader );
    loader.setMeshoptDecoder( MeshoptDecoder );
    loader.load( './extras/head.glb', function ( gltf ) {
 
      model = gltf.scene;
      scene.add(model);
      model.traverse(function(obj){
        if(obj.isMesh){
          console.log(obj.name);
          if(obj.name == "mesh_0_5"){
            //const material = new THREE.MeshBasicMaterial( {
              //color: obj.material.color,  
              obj.material.envMap = textureCube;
              obj.material.roughness = .3;
              obj.material.emissive = new THREE.Color(0x222222);

            //} );
            //obj.material = material;
          }else{
            const material = new THREE.MeshToonMaterial( {
              color: obj.material.color,
              gradientMap: gradientMap
            } );
            // const material = new THREE.MeshBasicMaterial( {
            //   color: obj.material.color,
            //   gradientMap: gradientMap
            // } );
            obj.material = material;
          }
          //console.log(obj.name)
          // obj.castShadow = true;
          // obj.receiveShadow = true;
          // obj.material.emissiveIntensity = 0;//new THREE.Color(0xffffff)
          // meshes.push(new PaintMesh( {mesh:obj, index:index} ))
          // index++;
        }
      })


    animate();
  });


}



function onWindowResize() {

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
 
  renderer.setSize( window.innerWidth, window.innerHeight );

}
let iSize = 0, iInc = Math.random()*200, iSpeed = .4+Math.random()*1; 
function animate() {
  TWEEN.update();
  requestAnimationFrame( animate );
  
  camera.updateMatrixWorld();
  
  const delta = clock.getDelta();

  // if(loadingHelper)
  //   loadingHelper.update({delta:delta});
	if(model != null)
    model.rotation.y+=delta*2;
  controls.update();
  outlineEffect.render( scene, camera );

  mouse.moved = false;
  
}
