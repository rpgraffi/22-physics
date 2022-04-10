import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import * as dat from 'lil-gui'
import * as CANNON from 'cannon-es'

/**
 * Additional Infos
 * There are also Constraints like the HingeConstraints, DistanceContraint, LockConstraints, PointToPointConstraints
 * Look into the Dokumentation
 * Use Worker to split worload in different threads
 * Physis.js will do workers and combinations of the 2 worlds automatically
 */

// console.log(CANNON);
const clock = new THREE.Clock()
/**
 * Physics
 */
// World
const world = new CANNON.World()
// for performance (other collision calculation) - sleepSpeedLimit & sleepTimeLimit are also available
world.broadphase = new CANNON.SAPBroadphase(world)
world.allowSleep = true

world.gravity.set(0, -9.82, 0)

// Materials (Jellyness)
const defaultMaterial = new CANNON.Material('concrete')
// const plasticMaterial = new CANNON.Material('plastic')

// Contact material (defines what happens when 2 materials meet each other eg. concrete & plastic)
const defaultContactMaterial = new CANNON.ContactMaterial(
    defaultMaterial,
    defaultMaterial,
    {
        friction: .1,
        restitution: .7// bouncyness
    }
)
world.addContactMaterial(defaultContactMaterial)
world.defaultContactMaterial = defaultContactMaterial



// Floor
const floorShape = new CANNON.Plane()
const floorBody = new CANNON.Body()
floorBody.mass = 0
// You can combine more than 1 shape (for more complex shapes)
floorBody.addShape(floorShape)
floorBody.quaternion.setFromAxisAngle(
    new CANNON.Vec3(-1, 0, 0),
    Math.PI * .5
)
// floorBody.material = defaultMaterial
world.addBody(floorBody)


/**
 * Debug
 */
const gui = new dat.GUI()
const debugObject = {}

debugObject.createSphere = () => {
    createSphere(
        Math.random() * .5, 
    {
        x: (Math.random()-.5) * 5, 
        y: 10, 
        z: (Math.random() -.5)* 5
    })
}

debugObject.createBox = () => {
    createBox(Math.random(), Math.random(), Math.random(),
    {
        x: (Math.random() -.5) * 5,
        y: 10, 
        z: (Math.random() -.5) * 5
    })
}

debugObject.reset = () => {
    for (const object of objectsToUpdate) {

        // Remove Body
        object.body.removeEventListener('collide', playHitSound)
        world.removeBody(object.body)

        // Remove Mesh
        scene.remove(object.mesh)

        // Remove objectsToUpdate
    }
    objectsToUpdate.splice(0, objectsToUpdate.length) 
}

gui.add(debugObject, 'createSphere')
gui.add(debugObject, 'createBox')
gui.add(debugObject, 'reset')

/**
 * Base
 */
// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

/**
 * Sounds
 */
const hitSound = new Audio('/sounds/hit.mp3')
let soundPrev = 0

const playHitSound = (collision) => {
    const elapsedTime = clock.getElapsedTime()  
    let deltaTime = elapsedTime - soundPrev
    // console.log(deltaTime);
    
    const impactStrength = collision.contact.getImpactVelocityAlongNormal()
    if (impactStrength > 1.5 && deltaTime > 0.001) {
        // console.log((impactStrength / 10) < 1 ? impactStrength / 10 : 1 );
        // console.log('Made sound');
        hitSound.volume = (impactStrength / 10) < 1 ? impactStrength / 10 : 1 
        
        hitSound.currentTime = 0
        hitSound.play()
        
    }
    soundPrev = elapsedTime
}

/**
 * Textures
 */
const textureLoader = new THREE.TextureLoader()
const cubeTextureLoader = new THREE.CubeTextureLoader()

const environmentMapTexture = cubeTextureLoader.load([
    '/textures/environmentMaps/0/px.png',
    '/textures/environmentMaps/0/nx.png',
    '/textures/environmentMaps/0/py.png',
    '/textures/environmentMaps/0/ny.png',
    '/textures/environmentMaps/0/pz.png',
    '/textures/environmentMaps/0/nz.png'
])



/**
 * Floor
 */
const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 10),
    new THREE.MeshStandardMaterial({
        color: '#777777',
        metalness: 0.3,
        roughness: 0.4,
        envMap: environmentMapTexture,
        envMapIntensity: 0.5
    })
)
floor.receiveShadow = true
floor.rotation.x = - Math.PI * 0.5
scene.add(floor)

/**
 * Lights
 */
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7)
scene.add(ambientLight)

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.2)
directionalLight.castShadow = true
directionalLight.shadow.mapSize.set(1024, 1024)
directionalLight.shadow.camera.far = 15
directionalLight.shadow.camera.left = - 7
directionalLight.shadow.camera.top = 7
directionalLight.shadow.camera.right = 7
directionalLight.shadow.camera.bottom = - 7
directionalLight.position.set(5, 5, 5)
scene.add(directionalLight)

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
camera.position.set(- 3, 3, 3)
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas
})
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

/**
 * Utils
 */
// Sphere
const objectsToUpdate = []

const sphereGeometry = new THREE.SphereBufferGeometry(1, 20, 20)
const sphereMaterial = new THREE.MeshStandardMaterial({
    metalness: .3,
    roughness: .4,
    envMap: environmentMapTexture
})

const createSphere = (radius, position) => {
    // Three.js mesh
    const mesh = new THREE.Mesh(sphereGeometry, sphereMaterial)
    mesh.scale.set(radius, radius, radius)
    mesh.castShadow = true
    mesh.position.copy(position)
    scene.add(mesh)

    // Cannon.js body
    const shape = new CANNON.Sphere(radius)
    const body = new CANNON.Body({
        mass: 1, 
        position: new CANNON.Vec3(0, 3, 0),
        shape,
        material: defaultMaterial
    })
    body.addEventListener('collide', playHitSound)

    body.position.copy(position)
    world.addBody(body)

    // save in objectsToUpdate
    objectsToUpdate.push({
        mesh : mesh,
        body : body
    })
}

createSphere(.5, {x: 0, y: 3, z: 0})
// createSphere(.5, {x: 2, y: 4, z: 1})

// Box
const boxGeometry = new THREE.BoxBufferGeometry(1, 1, 1)
const boxMaterial = new THREE.MeshStandardMaterial({
    metalness: .3,
    roughness: .4,
    envMap: environmentMapTexture
})

const createBox = (width, height, depth, position) => {
    
    const mesh = new THREE.Mesh(boxGeometry, boxMaterial)
    mesh.scale.set(width, height, depth)
    mesh.castShadow = true
    mesh.position.copy(position)
    scene.add(mesh)

    const shape = new CANNON.Box( new CANNON.Vec3(width * .5, height * .5, depth * .5))
    const body = new CANNON.Body({
        shape: shape,
        mass: 1,
        material: defaultMaterial
    })

    body.addEventListener('collide', playHitSound)

    body.position.copy(position)
    world.addBody(body)

    objectsToUpdate.push({
        mesh: mesh,
        body: body
    })
}

createBox(1, 1, 1, {x: 1, y: 4, z:1})


/**
 * Animate
 */

let previousTime = 0

const tick = () =>
{
    const elapsedTime = clock.getElapsedTime()
    const deltaTime = elapsedTime - previousTime
    previousTime = elapsedTime

    // // Physics wind
    // sphereBody.applyForce(new CANNON.Vec3(-.5, 0, 0), sphereBody.position)

    for (const object of objectsToUpdate) {
        object.mesh.position.copy(object.body.position)
        object.mesh.quaternion.copy(object.body.quaternion)
    }



    // Update physics world
    //          fps     
    world.step(1 / 60, deltaTime, 3)

    // // Updating Sphere Mesh position
    // sphere.position.copy(sphereBody.position)

    // Update controls
    controls.update()

    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()