var width = window.innerWidth;
var height = window.innerHeight;

// Three
var planet, planetMesh;
var raycaster = new THREE.Raycaster();
var mouse = new THREE.Vector2();
var scene = new THREE.Scene();
var view_matrix = new THREE.Matrix4();

// Game
var current =  {
    face: {}
};

var faces = {
    data: [],
};

var agents = {
    deer:  {
        name: "Deer",
        color: 0x000000,
        actions: {
            update: function(face) {
            },
        }
    },
    wolf:   {
        name: "Wolf",
        color: 0x000000,
        actions: {
            update: function(face) {
            },
        }
    },
    birds:  {
        name: "Birds",
        color: 0x000000,
        actions: {
            update: function(face) {
            },
        }
    },
}

var resources = {
    grass:  { name: "Grass",  color: 0xAAEEAA },
    bushes: { name: "Bushes", color: 0x88CC88 },
    trees:  { name: "Trees",  color: 0x66AA66 },
    stone:  { name: "Stone",  color: 0xAAAAAA },
    ore:    { name: "Ore",    color: 0xFFCCCC },
    clay:   { name: "Clay",   color: 0xFF6666 },
    water:  { name: "Water",  color: 0x8888FF },
};

var biomes = [
    { name: 'Hills',  resources: [ resources.water,  resources.stone,  resources.ore ],   color: 0x666666 },
    { name: 'Fields', resources: [ resources.bushes, resources.grass,  resources.stone ], color: 0x66EE66 },
    { name: 'Forest', resources: [ resources.grass,  resources.bushes, resources.trees ], color: 0x66AA66 },
    { name: 'Water',  resources: [ resources.water,  resources.ore,    resources.clay ],  color: 0x6666AA },
];

window.addEventListener('load', createScene, false);

function createScene() {
    var fieldOfView = 75;
    var aspectRatio = width / height;
    var nearPlane = 0.1;
    var farPlane = 10000;

    var camera = new THREE.PerspectiveCamera(fieldOfView, aspectRatio, nearPlane, farPlane);
    camera.position.z = 450;
    camera.lookAt(scene.position);

    var renderer = new THREE.WebGLRenderer();
    renderer.setSize(width, height)
    renderer.setClearColor(0x000003);
    renderer.shadowMap.enabled = true;
    
    var keyboard = new THREEx.KeyboardState();
    var controls = new THREE.OrbitControls(camera, renderer.domElement, keyboard);
    controls.minDistance = 300;
	controls.maxDistance = 800;

    var world = document.getElementById("world");
    world.appendChild(renderer.domElement);

    var ambientLight = new THREE.AmbientLight(0xEEDDDD, 0.0);
    scene.add(ambientLight);

    var light = new THREE.DirectionalLight(0xEEFFFF, 1.0);
    light.position.set(600, 0, 600);
    light.castShadow = true;
    light.shadow.camera.left = -100;
    light.shadow.camera.right = 100;
    light.shadow.camera.top = 100;
    light.shadow.camera.bottom = -100;
    scene.add(light);

    scene.background = new THREE.CubeTextureLoader().setPath('/') .load( [
		'6.png',
		'5.png',
		'4.png',
		'3.png',
		'2.png',
		'1.png',
	]);

    // UI
    var ui_sphere = new THREE.SphereGeometry(20,12,12);
    var ui_material = new THREE.MeshLambertMaterial({
        color: 0xCCCCCC, transparent: true, opacity: 0.5
    });
    var ui_mesh = new THREE.Mesh(ui_sphere, ui_material);

    makeWorld();
    render();

    function makeWorld() {
        // Planet
        var planetGeometry = new THREE.IcosahedronGeometry(200, 2);
        current.face = planetGeometry.faces[0];
        
        var planetMaterial = new THREE.MeshPhongMaterial({
            vertexColors: THREE.FaceColors,
            color: 0x333333,
            shading: THREE.FlatShading 
        })

        planetMesh = new THREE.Mesh(planetGeometry, planetMaterial);
        planetMesh.castShadow = true;
        planetMesh.recieveShadow = true;
        planetMesh.position.set(0, 0, 0);

        planet = new THREE.Group();
        planet.rotation.set(0, 0, 0);
        planet.add(planetMesh);

        var resource_geometry =  new THREE.SphereGeometry( 5, 8, 8 );
        planetGeometry.faces.forEach(function(face, i) {
            // Faces
            let tri = new THREE.Triangle(
                planetMesh.geometry.vertices[face.a],
                planetMesh.geometry.vertices[face.b],
                planetMesh.geometry.vertices[face.c]
            );
            let mid = tri.midpoint();

            // Resources
            let biome = biomes[ i % biomes.length ];
            let resource = biome.resources[i % biome.resources.length]

            if ((i % 3) && (i % 5) && (i % 8)) {
                let resource_material = new THREE.MeshLambertMaterial({ color: resource.color });
                let resource_mesh = new THREE.Mesh(resource_geometry, resource_material);
                resource_mesh.position.set(mid.x, mid.y, mid.z);
                planet.add(resource_mesh);
            }

            let adj = []
            
            planetGeometry.faces.forEach(function(x, j) {
                if (Math.abs(x.normal.angleTo(face.normal) > Math.PI/12))
                    return false;
                adj.push(j)
            })
            
            faces.data.push({
                biome: biome,
                resource: resource,
                midpoint: mid,
                adj: adj
            });

            if( i != 0) {
                face.color.set(biome.color);
            }
        });

        planet.add(ui_mesh)
        scene.add(planet);

        // Ring

        particles = new THREE.Group();
        var geometry = new THREE.TetrahedronGeometry(2, 0);
        for (let i = 0; i < 256; i ++) {
            let material = new THREE.MeshLambertMaterial({ color: 0xAAAAAA });
            let mesh = new THREE.Mesh(geometry, material);
            let pos = polarRandom(300, 500);
            mesh.position.set( pos.x, gaussianRandom(-100, 100), pos.y ); 
            mesh.updateMatrix();
            mesh.matrixAutoUpdate = false;
            particles.add(mesh);
        }
        scene.add(particles);

        window.addEventListener('resize',    handleResize, false);
        window.addEventListener('mousemove', onMouseMove,  false );
        window.addEventListener('keydown',   onKeyDown,    false );

        function onKeyDown( event ) {
            switch(event.keyCode) {
                case keys.H:
                    go('West');
                    break;
                case keys.J:
                    go('North');                    
                    break;
                case keys.K:
                    go('South');
                    break;
                case keys.L:
                    go('East');
                    break;
            }
        }

        function onMouseMove( event ) {
            mouse.x = ( event.clientX / width ) * 2 - 1;
            mouse.y = - ( event.clientY / height ) * 2 + 1;
        }

        function handleResize() {
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize( width, height );
        }
    }

    function render() {
        requestAnimationFrame(render);

        planet.rotation.y += 0.0005;
        particles.rotation.y += 0.001;

        controls.update();

        raycaster.setFromCamera( mouse, camera );
        raycaster.intersectObject(planetMesh).forEach(function(x) {
            let face = faces.data[x.faceIndex];
            setFace(face)
        });

        renderer.render(scene, camera);
    }

    function setFace(face) {
        current.face = face;
        let pos = face.midpoint;
        ui_mesh.position.set( pos.x, pos.y, pos.z );
    }

    function go(direction) {
        let opts = current.face.adj.map( x => faces.data[x] );
        const up = new THREE.Vector3(0,1,0);
        switch(direction) {
            case 'North':
                opts.sort((a, b) => {
                    return up.angleTo(a.midpoint) > up.angleTo(b.midpoint) ? 1 : -1;
                });
                break;
            case 'South':
                opts.sort((a, b) => {
                    return up.angleTo(b.midpoint) > up.angleTo(a.midpoint) ? 1 : -1; 
                });
                break;
            case 'East':
                opts.sort((a, b) => {
                    return up.angleTo(a.midpoint) > up.angleTo(b.midpoint) ? 1 : -1;
                });
                break;
            case 'West':
                opts.sort((a, b) => {
                    return up.angleTo(a.midpoint) > up.angleTo(b.midpoint) ? 1 : -1;
                });
                break;
            default: return;
        }
        setFace(opts[0]);
    }

    function gaussianRand() {
        var rand = 0;
        for (var i = 0; i < 6; i += 1) {
            rand += Math.random();
        }
        return rand / 6;
    }   

    function gaussianRandom(start, end) {
        return Math.floor(start + gaussianRand() * (end - start + 1));
    }

    function polarRandom(start, end) {
        theta = 2 * Math.PI * Math.random();
        dist = Math.sqrt(gaussianRand() * (Math.pow(end, 2) - Math.pow(start, 2)) + Math.pow(start, 2));
        return new THREE.Vector2(dist * Math.cos(theta), dist * Math.sin(theta));
    }
}
