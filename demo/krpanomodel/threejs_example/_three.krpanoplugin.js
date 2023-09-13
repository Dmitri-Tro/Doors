/*
	krpano ThreeJS example plugin
	- use three.js inside krpano
	- with stereo-rendering and WebVR support
	- with 3d object hit-testing (onover, onout, onup, ondown, onclick) and mouse cursor handling
*/

function krpanoplugin()
{
	var local  = this;
	var krpano = null;
	var device = null;
	var plugin = null;


	local.registerplugin = function(krpanointerface, pluginpath, pluginobject)
	{
		krpano = krpanointerface;
		device = krpano.device;
		plugin = pluginobject;

		if (krpano.version < "1.19")
		{
			krpano.trace(3,"ThreeJS plugin - too old krpano version (min. 1.19)");
			return;
		}

		if (!device.webgl)
		{
			// show warning
			krpano.trace(2,"ThreeJS plugin - WebGL required");
			return;
		}

		krpano.debugmode = true;
		krpano.trace(0, "ThreeJS krpano plugin");

		// load the requiered three.js scripts
		load_scripts(["three.min.js", "OBJLoader.js"], start);
	}

	local.unloadplugin = function()
	{
		// no unloading support at the moment
	}

	local.onresize = function(width, height)
	{
		return false;
	}


	function resolve_url_path(url)
	{
		if (url.charAt(0) != "/" && url.indexOf("://") < 0)
		{
			// adjust relative url path
			url = krpano.parsepath("%CURRENTXML%/" + url);
		}

		return url;
	}


	function load_scripts(urls, callback)
	{
		if (urls.length > 0)
		{
			var url = resolve_url_path( urls.splice(0,1)[0] );

			var script = document.createElement("script");
			script.src = url;
			script.addEventListener("load", function(){ load_scripts(urls,callback); });
			script.addEventListener("error", function(){ krpano.trace(3,"loading file '"+url+"' failed!"); });
			document.getElementsByTagName("head")[0].appendChild(script);
		}
		else
		{
			// done
			callback();
		}
	}


	// helper
	var M_RAD = Math.PI / 180.0;


	// ThreeJS/krpano objects
	var renderer = null;
	var scene = null;
	var camera = null;
	var stereocamera = null;
	var camera_hittest_raycaster = null;
	var krpano_panoview = null;
	var krpano_panoview_euler = null;
	var krpano_projection = new Float32Array(16);		// krpano projection matrix
	var krpano_depthbuffer_scale = 1.0001;				// depthbuffer scaling (use ThreeJS defaults: znear=0.1, zfar=2000)
	var krpano_depthbuffer_offset = -0.2;


	function start()
	{
		// create the ThreeJS WebGL renderer, but use the WebGL context from krpano
		renderer = new THREE.WebGLRenderer({canvas:krpano.webGL.canvas, context:krpano.webGL.context});
		renderer.autoClear = false;
		renderer.setPixelRatio(1);	// krpano handles the pixel ratio scaling

		// restore the krpano WebGL settings (for correct krpano rendering)
		restore_krpano_WebGL_state();

		// use the krpano onviewchanged event as render-frame callback (this event will be directly called after the krpano pano rendering)
		krpano.set("events[__threejs__].keep", true);
		krpano.set("events[__threejs__].onviewchange", adjust_krpano_rendering);	// correct krpano view settings before the rendering
		krpano.set("events[__threejs__].onviewchanged", render_frame);

		// enable continuous rendering (that means render every frame, not just when the view has changed)
		krpano.view.continuousupdates = true;

		// register mouse and touch events
		if (device.browser.events.mouse)
		{
			krpano.control.layer.addEventListener("mousedown", handle_mouse_touch_events, true);
		}
		if (device.browser.events.touch)
		{
			krpano.control.layer.addEventListener(device.browser.events.touchstart, handle_mouse_touch_events, true);
		}

		// basic ThreeJS objects
		scene = new THREE.Scene();
		camera = new THREE.Camera();
		stereocamera = new THREE.Camera();
		camera_hittest_raycaster = new THREE.Raycaster();
		krpano_panoview_euler = new THREE.Euler();

		// build the ThreeJS scene (start adding custom code there)
		build_scene();
		
		// restore the krpano WebGL settings (for correct krpano rendering)
		restore_krpano_WebGL_state();
	}


	function restore_krpano_WebGL_state()
	{
		var gl = krpano.webGL.context;

		gl.disable(gl.DEPTH_TEST);
		gl.cullFace(gl.FRONT);
		gl.frontFace(gl.CCW);
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
		gl.activeTexture(gl.TEXTURE0);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
		gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
		gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
		
		// restore the current krpano WebGL program
		krpano.webGL.restoreProgram();
		
		//renderer.resetGLState();
	}


	function restore_ThreeJS_WebGL_state()
	{
		var gl = krpano.webGL.context;

		gl.enable(gl.DEPTH_TEST);
		gl.depthFunc(gl.LEQUAL);
		gl.enable(gl.CULL_FACE);
		gl.cullFace(gl.BACK);
		gl.clearDepth(1);
		gl.clear(gl.DEPTH_BUFFER_BIT);

		renderer.resetGLState();
	}


	function krpano_projection_matrix(sw,sh, zoom, xoff,yoff)
	{
		var m = krpano_projection;

		var pr = device.pixelratio;
		sw = pr / (sw*0.5);
		sh = pr / (sh*0.5);

		m[0]  = zoom*sw;    m[1]  = 0;          m[2]  = 0;                          m[3]  = 0;
		m[4]  = 0;          m[5]  = -zoom*sh;   m[6]  = 0;                          m[7]  = 0;
		m[8]  = xoff;       m[9]  = -yoff*sh;   m[10] = krpano_depthbuffer_scale;   m[11] = 1;
		m[12] = 0;          m[13] = 0;          m[14] = krpano_depthbuffer_offset;  m[15] = 1;
	}


	function update_camera_matrix(camera)
	{
		var m = krpano_projection;
		camera.projectionMatrix.set(m[0],m[4],m[8],m[12], m[1],m[5],m[9],m[13], m[2],m[6],m[10],m[14], m[3],m[7],m[11],m[15]);
	}


	function adjust_krpano_rendering()
	{
		if (krpano.view.fisheye != 0.0)
		{
			// disable the fisheye distortion, ThreeJS objects can't be rendered with it
			krpano.view.fisheye = 0.0;
		}
	}


	function render_frame()
	{
		var gl = krpano.webGL.context;
		var vr = krpano.webVR && krpano.webVR.enabled ? krpano.webVR : null;

		var sw = gl.drawingBufferWidth;
		var sh = gl.drawingBufferHeight;


		// setup WebGL for ThreeJS
		restore_ThreeJS_WebGL_state();

		// set the camera/view rotation
		krpano_panoview = krpano.view.getState(krpano_panoview);	// the 'krpano_panoview' object will be created and cached inside getState()
		krpano_panoview_euler.set((180 -krpano_panoview.v) * M_RAD, -krpano_panoview.h * M_RAD, krpano_panoview.r * M_RAD, "YXZ");
		camera.quaternion.setFromEuler(krpano_panoview_euler);
		camera.updateMatrixWorld(true);

		// set the camera/view projection
		krpano_projection_matrix(sw,sh, krpano_panoview.z, 0, krpano_panoview.yf);
		update_camera_matrix(camera);


		// do scene updates
		update_scene();


		// render the scene
		if (krpano.display.stereo == false)
		{
			// normal rendering
			renderer.setViewport(0,0, sw,sh);
			renderer.render(scene, camera);
		}
		else
		{
			// stereo / VR rendering
			sw *= 0.5;	// use half screen width

			var stereo_scale = 0.05;
			var stereo_offset = Number(krpano.display.stereooverlap);

			// use a different camera for stereo rendering to keep the normal one for hit-testing
			stereocamera.quaternion.copy(camera.quaternion);
			stereocamera.updateMatrixWorld(true);

			// render left eye
			var eye_offset = -0.03;
			krpano_projection_matrix(sw,sh, krpano_panoview.z, stereo_offset, krpano_panoview.yf);

			if (vr)
			{
				eye_offset = vr.eyetranslt(1);						// get the eye offset (from the WebVR API)
				vr.prjmatrix(1, krpano_projection);					// replace the projection matrix (with the one from WebVR)
				krpano_projection[10] = krpano_depthbuffer_scale;	// adjust the depthbuffer scaling
				krpano_projection[14] = krpano_depthbuffer_offset;
			}

			// add the eye offset
			krpano_projection[12] = krpano_projection[0] * -eye_offset * stereo_scale;

			update_camera_matrix(stereocamera);
			renderer.setViewport(0,0, sw,sh);
			renderer.render(scene, stereocamera);

			// render right eye
			eye_offset = +0.03;
			krpano_projection[8] = -stereo_offset;	// mod the projection matrix (only change the stereo offset)

			if (vr)
			{
				eye_offset = vr.eyetranslt(2);						// get the eye offset (from the WebVR API)
				vr.prjmatrix(2, krpano_projection);					// replace the projection matrix (with the one from WebVR)
				krpano_projection[10] = krpano_depthbuffer_scale;	// adjust the depthbuffer scaling
				krpano_projection[14] = krpano_depthbuffer_offset;
			}

			// add the eye offset
			krpano_projection[12] = krpano_projection[0] * -eye_offset * stereo_scale;

			update_camera_matrix(stereocamera);
			renderer.setViewport(sw,0, sw,sh);
			renderer.render(scene, stereocamera);
		}

		// important - restore the krpano WebGL state for correct krpano rendering
		restore_krpano_WebGL_state();
	}



	// -----------------------------------------------------------------------
	// ThreeJS User Content - START HERE


	var debug = false;


	var rooms = {
		'model/2_01_0001(1).jpg' : {
			placement : 'camera_pos_dining',
			rotation : -0.365
		},
		'model/2_01_0002(1).jpg' : {
			placement : 'camera_pos_living',
			rotation : -0.363
		},
		'model/2_01_0003(1).jpg' : {
			placement : 'camera_pos_hall',
			rotation : -0.364
		},
		'model/2_01_0004(1).jpg' : {
			placement : 'camera_pos_office',
			rotation : -0.362
		},
		'model/2_01_0005(1).jpg' : {
			placement : 'camera_pos_hall2',
			rotation : -0.364
		},
		'model/2_01_0006(1).jpg' : {
			placement : 'camera_pos_childsroom',
			rotation : -0.366
		},
		'model/2_01_0007(1).jpg' :  {
			placement : 'camera_pos_bedroom',
			rotation : -0.364
		}
	};

	var wrapper = null, group = null, blueCircle = null, boxes = [], currentUrl = null, shader = null;

	function init_shader(url1, url2, onTexturesReady)
	{
		if (shader == null) {
			shader = new THREE.ShaderMaterial ({
				uniforms : {
					map1 : {
						type : 't', value : null
					},
					placement1 : {
						type : 'v3', value : new THREE.Vector3
					},
					rotation1 : {
						type : 'f', value : 0
					},
					map2 : {
						type : 't', value : null
					},
					placement2 : {
						type : 'v3', value : new THREE.Vector3
					},
					rotation2 : {
						type : 'f', value : 0
					},
					ratio : {
						type : 'f', value : 0
					}
				},
				vertexShader : '\
					varying vec3 worldPosition;\n\
					void main () {\n\
						vec4 p = vec4 (position, 1.0);\n\
						worldPosition = (modelMatrix * p).xyz;\n\
						gl_Position = projectionMatrix * modelViewMatrix * p;\n\
					}',
				fragmentShader : (debug ? '#extension GL_OES_standard_derivatives : enable\n' : '') + '\
					uniform sampler2D map1;\n\
					uniform vec3 placement1;\n\
					uniform float rotation1;\n\
					\n\
					uniform sampler2D map2;\n\
					uniform vec3 placement2;\n\
					uniform float rotation2;\n\
					\n\
					uniform float ratio;\n\
					\n\
					varying vec3 worldPosition;\n\
					\n\
					const float seamWidth = 0.01;\n\
					\n\
					float mix(float x, float y, bool a) {\n\
						return a ? y : x;\n\
					}\n\
					\n\
					// proposed solution from\n\
					// http://stackoverflow.com/questions/26070410/robust-atany-x-on-glsl-for-converting-xy-coordinate-to-angle\n\
					// swaps params when |x| <= |y|\n\
					float atan2(in float y, in float x) {\n\
						bool s = (abs(x) > abs(y));\n\
						return mix(3.14159265358979/2.0 - atan(x,y), atan(y,x), s);\n\
					}\n\
					\n\
					void main () {\n\
						vec3 R = worldPosition - placement1;\n\
						float r = length (R);\n\
						float c = -R.y / r;\n\
						float theta = acos (c);\n\
						float phi = atan2 (R.x, -R.z);\n\
						float seam = \n\
							max (0.0, 1.0 - abs (R.x / r) / seamWidth) *\n\
							clamp (1.0 + (R.z / r) / seamWidth, 0.0, 1.0);\n\
						vec4 color1 = texture2D (map1, vec2 (\n\
							fract (0.5 + phi / 6.2831852) + rotation1,\n\
							theta / 3.1415926\n\
						), -2.0 * log2(1.0 + c * c) -12.3 * seam);\n\
						\n\
						R = worldPosition - placement2;\n\
						r = length (R);\n\
						c = -R.y / r;\n\
						theta = acos (c);\n\
						phi = atan2 (R.x, -R.z);\n\
						seam = \n\
							max (0.0, 1.0 - abs (R.x / r) / seamWidth) *\n\
							clamp (1.0 + (R.z / r) / seamWidth, 0.0, 1.0);\n\
						vec4 color2 = texture2D (map2, vec2 (\n\
							fract (0.5 + phi / 6.2831852) + rotation2,\n\
							theta / 3.1415926\n\
						), -2.0 * log2(1.0 + c * c) -12.3 * seam);\n\
						\n\
						gl_FragColor = mix (color1, color2, ratio)' + (debug ? ' + vec4 (dFdx(worldPosition), 1.0)' : '') + ';\n\
					}'
			});

			shader.transition = function () {
				var ratio = krpano.get ('ourTransitionProgress');

				var url1 = shader.url1;
				var url2 = shader.url2;

				var pos = (/*new THREE.Vector3*/shader.uniforms.placement1.value.set (0, 0, 0)).addScaledVector (rooms[url1].placement, 1 - ratio).addScaledVector (rooms[url2].placement, ratio);
				var rot = rooms[url1].rotation * (1 - ratio) + rooms[url2].rotation * ratio;

				group.position.copy (pos).multiplyScalar (-1);
				wrapper.rotation.y = rot + 2.65; // TODO where 2.65 is coming from ??

				// the shader expects placements to be proper world space locations, so they need to be re-calculated
				wrapper.updateMatrixWorld (true);
				group.localToWorld (shader.uniforms.placement1.value.copy (rooms[url1].placement));
				group.localToWorld (shader.uniforms.placement2.value.copy (rooms[url2].placement));

				// rotations...
				shader.uniforms.rotation1.value = rooms[url1].rotation - 2.635; // TODO where 2.635 is coming from ??
				shader.uniforms.rotation2.value = rooms[url2].rotation - 2.635;

				shader.uniforms.ratio.value = ratio;

				if (ratio == 1) {
					// transition is over - show the actual pano image now
					// loadxml's onloadcomplete calls the global functions
					// https://krpano.com/forum/wbb/index.php?page=Thread&postID=41317#post41317
					window.__hide_our_shader = function () { shader.visible = false; };
					krpano.call('loadxml(\'<krpano><image><sphere url="' + resolve_url_path (url2) + '"/></image><events onloadcomplete="js( __hide_our_shader() );"/></krpano>\', null, KEEPALL)');
				}
			};
		}

		shader.url1 = url1;
		shader.url2 = url2;

		if (shader.uniforms.map1.value) { shader.uniforms.map1.value.dispose (); }
		if (shader.uniforms.map2.value) { shader.uniforms.map2.value.dispose (); }

		var manager = new THREE.LoadingManager;
		manager.onLoad = onTexturesReady;

		var loader = new THREE.TextureLoader (manager); // quickly load small texture versions for the transition
		shader.uniforms.map1.value = loader.load (resolve_url_path (url1.replace (/jpg$/i, 'preview.jpg'))); shader.uniforms.map1.value.wrapS = THREE.RepeatWrapping;
		shader.uniforms.map2.value = loader.load (resolve_url_path (url2.replace (/jpg$/i, 'preview.jpg'))); shader.uniforms.map2.value.wrapS = THREE.RepeatWrapping;
	}


	function show_room(url)
	{
		if (shader && shader.visible) {
			console.error ('transition in progress');
			return;
		}

		if (currentUrl != url) {

			init_shader (currentUrl ? currentUrl : url, url, function () {
				group.traverse (function (mesh) {
					if (mesh.visible && !mesh.isCircle && mesh.material) {
						mesh.material = shader;
					}
				});

				shader.visible = true;

				krpano.set ('ourTransitionProgress', 0);
				krpano.actions.tween ('ourTransitionProgress', 1,
					0.6, // = transition time, seconds
					'easeoutquad', null, shader.transition);

				// force the update at ourTransitionProgress = 0
				shader.transition ();

				// force re-draw
				render_frame ();
			});

			currentUrl = url;
		}

		if (debug) {
			window.wrapper = wrapper;
			window.scene = scene;
			window.camera = camera;
			window.krpano = krpano;
			window.rooms = rooms;
		}
	}


	function build_scene()
	{
		var loader = new THREE.OBJLoader;
		loader.load (resolve_url_path ('model/testapartment_lowpoly_boxes.obj'), function (g) {
			g.traverse (function (object) {

				// collect the boxes

				if (object.name.indexOf ('_Box') == 0) {

					object.geometry.computeBoundingBox ();

					// patch vertical coordinate temporarily
					object.geometry.boundingBox.min.y = -1e9;
					object.geometry.boundingBox.max.y =  1e9;

					boxes.push (object.geometry.boundingBox.clone ());

				}
			});

			loader.load (resolve_url_path ('model/testapartment_lowpoly.obj'), function (g) {

				wrapper = new THREE.Object3D;
				wrapper.add (group = g); scene.add (wrapper);

				group.traverse (function (object) {

					// hide all the shit for now

					if (object.material) {
						object.material.visible = false;
					}

					// collect camera positions

					if (object.name.substr (0, 10) == 'camera_pos') {
						object.visible = false;
						object.updateMatrixWorld (true);
						object.geometry.computeBoundingSphere ();

						for (var key in rooms) {
							if (rooms[key].placement == object.name) {
								rooms[key].placement = object.geometry.boundingSphere.center;
							}
						}

					}

				});

				// now create white circles

				var circle = (new THREE.TextureLoader).load (resolve_url_path ('circle.png'), function () {
					blueCircle = new THREE.Mesh (new THREE.PlaneGeometry (25, 25), new THREE.MeshBasicMaterial ({
						map: circle, transparent: true, depthTest: false, color: 0xAFFF
					}));
					blueCircle.frustumCulled = false;
					blueCircle.raycast = new Function;
					scene.add (blueCircle);

					for (var key in rooms) {
						var plane = new THREE.Mesh (new THREE.PlaneGeometry (25, 25), new THREE.MeshBasicMaterial ({
							map: circle, transparent: true, depthTest: false
						}));
						plane.name = key;
						plane.isCircle = true;
						plane.position.copy (rooms[key].placement);
						plane.position.y = -0;
						plane.rotation.x = -Math.PI / 2;
						group.add (plane);
						plane.raycast = function (raycaster) {
							// check the intersection but do not report it
							var intersects = [];
							THREE.Mesh.prototype.raycast.call (this, raycaster, intersects);
							// set opacity to mimic the matterport
							this.material.opacity = 0.5 * (1 + intersects.length);
						};
						rooms[key].circle = plane;
					}

					// finally show something

					show_room ('model/2_01_0001(1).jpg');
				});
			});
		});
	}


	function do_object_hittest(mx, my)
	{
		var mouse_x = (mx / krpano.area.pixelwidth)  * 2.0 - 1.0;
		var mouse_y = (my / krpano.area.pixelheight) * 2.0 - 1.0;

		if (krpano.display.stereo)
		{
			mouse_x += (mouse_x < 0.0 ? +1 : -1) * (1.0 - Number(krpano.display.stereooverlap)) * 0.5;
		}

		camera_hittest_raycaster.ray.direction.set(mouse_x, -mouse_y, 1.0).unproject(camera).normalize();

		var intersects = camera_hittest_raycaster.intersectObject (scene, true);
		if (intersects) {
			return intersects[0];//.object;
		}

		return null;
	}


	var downX = 0, downY = 0;

	function handle_mouse_touch_events(event)
	{
		var type = "";

		if (event.type == "mousedown")
		{
			type = "ondown";
			krpano.control.layer.addEventListener("mouseup", handle_mouse_touch_events, true);
		}
		else if (event.type == "mouseup")
		{
			type = "onup";
			krpano.control.layer.removeEventListener("mouseup", handle_mouse_touch_events, true);
		}
		else if (event.type == device.browser.events.touchstart)
		{
			type = "ondown";
			krpano.control.layer.addEventListener(device.browser.events.touchend, handle_mouse_touch_events, true);
		}
		else if (event.type == device.browser.events.touchend)
		{
			type = "onup";
			krpano.control.layer.removeEventListener(device.browser.events.touchend, handle_mouse_touch_events, true);
		}

		// get mouse / touch pos
		var ms = krpano.control.getMousePos(event.changedTouches ? event.changedTouches[0] : event);
		ms.x /= krpano.stagescale;
		ms.y /= krpano.stagescale;

		// is there a object as that pos?
		var hit = do_object_hittest(ms.x, ms.y);

		if (debug) {
			console.log (type, hit);
		}

		if (type == "ondown")
		{
			downX = ms.x;
			downY = ms.y;

			if (hit)
			{
				if (false/*hit.object.properties.capture*/)
				{
					krpano.mouse.down = true;
					event.stopPropagation();
				}

				event.preventDefault();
			}
		}
		else if (type == "onup")
		{
			krpano.mouse.down = false;

			if (hit) {
				var dpix = Math.abs (downX - ms.x) + Math.abs (downY - ms.y);
				if (dpix < 2) {
					// FIXME filter clicks processed by krpano ??
					var key_min, dist_min = 1e9,
						localPoint = hit.point.clone (); group.worldToLocal (localPoint);
					for (var key in rooms) {
						var dist = localPoint.distanceTo (rooms[key].placement);
						if (dist < dist_min) {
							dist_min = dist; key_min = key;
						}
					}

					show_room (key_min);
				}
			}
		}
	}


	var worldNormal = null, worldPosition = null;

	function handle_mouse_hovering()
	{
		// check mouse over state
		if (krpano.mouse.down == false)		// currently not dragging?
		{

			if (blueCircle) {
				var hit = do_object_hittest(krpano.mouse.x, krpano.mouse.y);
				if (hit && hit.face) {
					worldPosition = worldPosition || new THREE.Vector3;
					worldPosition.set (0, 0, 0);

					worldNormal = worldNormal || new THREE.Vector3;
					worldNormal.copy (hit.face.normal);

					hit.object.localToWorld (worldPosition);
					hit.object.localToWorld (worldNormal);

					worldNormal.sub (worldPosition);

					blueCircle.position.copy (hit.point);

					hit.point.add (worldNormal);
					blueCircle.lookAt (hit.point);

					// hack to work around transparent sorting issue
					var hack = 0.85;
					camera.localToWorld (camera.worldToLocal (blueCircle.position).multiplyScalar (hack));
					blueCircle.scale.set (hack, hack, hack);
				}
			}

		}
	}


	function update_white_circles()
	{
		if (currentUrl) {
			for (var key in rooms) if (rooms[key].circle) {
				rooms[key].circle.visible = !boxes.length;
				for (var b = 0; b < boxes.length; b++) {
					if (boxes[b].containsPoint (rooms[currentUrl].placement) &&
						boxes[b].containsPoint (rooms[key].placement)) {
						rooms[key].circle.visible = true;
					}
				}
			}
		}
	}


	function update_scene()
	{
		update_white_circles();

		handle_mouse_hovering();
	}
}
