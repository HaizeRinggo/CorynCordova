const API_BASE_URL = "https://untalhaize.xyz/Coryn/";
//cloudflared tunnel run coryn -- https://untalhaize.xyz
//https://nervous-pamperer-parabola.ngrok-free.dev
function url(file) {
    return API_BASE_URL + file;
}


function activeMenuOption(href) {

    const links = document.querySelectorAll(".app-menu .nav-link");
    links.forEach(link => {
        link.classList.remove("active");
        link.removeAttribute("aria-current");
    });

    const targetHref = href ? href : "#/";
    const activeLink = document.querySelector(`[href="${targetHref}"]`);

    if (activeLink) {
        activeLink.classList.add("active");
        activeLink.setAttribute("aria-current", "page");
    }
}

function decodeJWT(token) {
    try {
        const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
        return JSON.parse(atob(base64));
    } catch (e) {
        return null;
    }
}

const app = angular.module("angularjsApp", ["ngRoute"])


//###########################################
//#                                         #
//#                  RUTAS                  #
//#                                         #
//###########################################

app.config(function ($routeProvider, $locationProvider, $httpProvider) {
    $locationProvider.hashPrefix("")

    $httpProvider.interceptors.push(function () {
        return {
            request: function (config) {
                const token = localStorage.getItem("jwt");
                if (token) {
                    config.headers.Authorization = "Bearer " + token;
                }
                return config;
            }
        };
    });

    $routeProvider
        .when("/", {
            templateUrl: "views/login.html",
            controller: "loginCtrl"
        })
        .when("/biblioteca", {
            templateUrl: "views/biblioteca.html",
            controller: "bibliotecaCtrl"
        })
        .when("/favoritos", {
            templateUrl: "views/lista.html",
            controller: "listaCtrl",
            filtro: "favoritos"
        })
        .when("/pendientes", {
            templateUrl: "views/lista.html",
            controller: "listaCtrl",
            filtro: "pendientes"
        })
        .when("/viendo", {
            templateUrl: "views/lista.html",
            controller: "listaCtrl",
            filtro: "viendo"
        })
        .when("/vistos", {
            templateUrl: "views/lista.html",
            controller: "listaCtrl",
            filtro: "vistos"
        })
        .when("/escaneo", {
            templateUrl: "views/escaneo.html",
            controller: "escaneoCtrl"
        })
        .when("/anime/:id", {
            templateUrl: "views/detalle.html",
            controller: "detalleCtrl"
        })
        .when("/demo", {
            templateUrl: "views/demo.html",
            controller: "demoCtrl"
        })
        .otherwise({
            redirectTo: "/"
        })
        .when("/confirmar/:session", {
            templateUrl: "views/confirmar.html",
            controller: "confirmarCtrl"
        })
})


app.run(["$rootScope", "$location", "$timeout", "$http", function ($rootScope, $location, $timeout, $http) {

    $rootScope.slide = ""
    $rootScope.spinnerGrow = false

    // Lee el JWT guardado y actualiza el estado de sesión (login / esAdmin)
    $rootScope.actualizarSesion = function () {
        const token = localStorage.getItem("jwt");
        $rootScope.login = !!token;
        $rootScope.esAdmin = false;

        if (token) {
            const payload = decodeJWT(token);
            if (payload && payload.sub) {
                const datos = payload.sub.split("/"); 
                $rootScope.esAdmin = datos[2] === "admin";
            }
        }
    };

    $rootScope.actualizarSesion();

    // Cierra sesión destruyendo el JWT y regresa al login
    $rootScope.logout = function () {
        localStorage.removeItem("jwt");
        $rootScope.actualizarSesion();
        $location.path("/");
    };

    $rootScope.$on("$routeChangeStart", function (event, next) {
        $rootScope.spinnerGrow = false;

        // Si ya hay sesión activa, no volver a mostrar el login
        const ruta = next && next.$$route ? next.$$route.originalPath : "";
        if (ruta === "/" && $rootScope.login) {
            $location.path("/biblioteca");
        }
    });

    $rootScope.$on("$routeChangeSuccess", function (event, current, previous) {

        document.documentElement.style.overflowX = "hidden";

        const path = current.$$route ? current.$$route.originalPath : "/";
        console.log("Navegando a:", path);

        if (path.indexOf("splash") == -1) {
            $rootScope.slide = "animate__animated animate__faster animate__bounceIn";

            $timeout(function () {
                document.documentElement.style.overflowX = "auto";
                $rootScope.slide = "";
            }, 3000);

            activeMenuOption(`#${path}`);
        }

    });

    $rootScope.$on("$routeChangeError", function () {
        $rootScope.spinnerGrow = false
    })

    $rootScope.irAConfirmarQR = function (sessionId) {
        $location.path("/confirmar/" + sessionId);
    };
}])

window.navegarDesdeDeepLink = function (sessionId) {
    var el = document.querySelector("[ng-app]");
    var scope = angular.element(el).scope();

    if (scope) {
        scope.$apply(function () {
            scope.irAConfirmarQR(sessionId);
        });
    } else {
        console.error("No se encontró el scope de Angular para navegar.");
    }
};
//###########################################
//#                                         #
//#              CONTROLADORES              #
//#                                         #
//###########################################


// --- CONTROLADOR PARA ESCANEAR EL DISCO ---

app.controller("escaneoCtrl", function ($scope, $http) {
    console.log("Módulo Escáner listo");

    $scope.jwt = localStorage.getItem("jwt");
    $scope.portadaUrl = function (anime) {
        return anime && anime.ruta_portada
            ? url("index.php?portada&ruta=" + anime.ruta_portada + "&token=" + $scope.jwt)
            : "assets/img/default-cover.jpg";
    };

    $scope.tabActiva = "escanear";
    $scope.cambiarTab = function (tab) {
        $scope.tabActiva = tab;
        if (tab === "gestionar") $scope.cargarRegistrados();
    };

    $scope.generosDisponibles = [];
    $http.get(url("index.php?obtener_generos")).then(function (r) {
        if (r.data.success) $scope.generosDisponibles = r.data.data;
    });

    $scope.carpetasEncontradas = [];
    $scope.cargando = false;
    $scope.mensaje = "";

    $scope.iniciarEscaneo = function () {
        $scope.cargando = true;
        $scope.mensaje = "Buscando en el disco, por favor espera...";

        $http.get(url("index.php?escanear")).then(function (response) {
            $scope.cargando = false;
            if (response.data.success) {
                $scope.carpetasEncontradas = response.data.data;
                $scope.mensaje = "¡Búsqueda completada! Se encontraron " + response.data.total_animes + " carpetas.";
            } else {
                $scope.mensaje = "Error: " + response.data.mensaje;
            }
        }, function (error) {
            $scope.cargando = false;
            $scope.mensaje = "Error crítico al contactar al servidor.";
            console.error(error);
        });
    };

    $scope.sincronizarAnime = function (carpeta) {
        carpeta.sincronizando = true;
        const payload = { titulo_carpeta: carpeta.titulo_busqueda, ruta_fisica: carpeta.ruta_fisica };

        $http.post(url("index.php?sincronizar_api"), payload).then(function (response) {
            carpeta.sincronizando = false;
            if (response.data.success) {
                carpeta.estado = "Guardado";
            } else {
                alert("Error al sincronizar: " + response.data.mensaje);
            }
        }, function (error) {
            carpeta.sincronizando = false;
            alert("Error de conexión al intentar sincronizar.");
            console.error(error);
        });
    };

    $scope.animesRegistrados = [];
    $scope.cargandoRegistrados = false;

    $scope.cargarRegistrados = function () {
        $scope.cargandoRegistrados = true;
        $http.get(url("index.php?obtener_animes")).then(function (response) {
            $scope.cargandoRegistrados = false;
            if (response.data.success) $scope.animesRegistrados = response.data.data;
        }, function () {
            $scope.cargandoRegistrados = false;
        });
    };

    // --- EDITAR ---
    $scope.modalEditarVisible = false;
    $scope.cargandoEdicion = false;
    $scope.guardandoEdicion = false;
    $scope.animeEdicion = {};
    $scope.nuevaPortadaFile = null;
    $scope.nuevaPortadaPreview = null;

    $scope.abrirModalEditar = function (anime) {
        $scope.modalEditarVisible = true;
        $scope.cargandoEdicion = true;
        $scope.animeEdicion = {};
        $scope.nuevaPortadaFile = null;
        $scope.nuevaPortadaPreview = null;

        $http.get(url("index.php?obtener_detalle&id=" + anime.id)).then(function (response) {
            $scope.cargandoEdicion = false;

            if (response.data.success) {
                var d = response.data.data;
                $scope.animeEdicion = {
                    id: d.id,
                    titulo_carpeta: d.titulo_carpeta,
                    titulo_oficial: d.titulo_oficial || d.titulo_carpeta,
                    sinopsis: d.sinopsis || '',
                    ruta_portada: d.ruta_portada,
                    generos_ids: (d.generos_ids || '').split(',').filter(Boolean).map(Number)
                };
            } else {
                alert("No se pudo cargar la información del anime.");
                $scope.modalEditarVisible = false;
            }
        }, function () {
            $scope.cargandoEdicion = false;
            alert("Error de red al cargar el anime.");
            $scope.modalEditarVisible = false;
        });
    };

    $scope.cerrarModalEditar = function () {
        $scope.modalEditarVisible = false;
    };

    $scope.toggleGeneroEdicion = function (id) {
        var idx = $scope.animeEdicion.generos_ids.indexOf(id);
        if (idx === -1) $scope.animeEdicion.generos_ids.push(id);
        else $scope.animeEdicion.generos_ids.splice(idx, 1);
    };

    $scope.generoEdicionActivo = function (id) {
        return $scope.animeEdicion.generos_ids && $scope.animeEdicion.generos_ids.indexOf(id) !== -1;
    };

    $scope.seleccionarPortada = function (input) {
        const file = input.files[0];
        if (!file) return;
        $scope.nuevaPortadaFile = file;

        const reader = new FileReader();
        reader.onload = function (e) {
            $scope.$apply(function () {
                $scope.nuevaPortadaPreview = e.target.result;
            });
        };
        reader.readAsDataURL(file);
    };

    $scope.guardarEdicion = function () {
        $scope.guardandoEdicion = true;

        const formData = new FormData();
        formData.append("id", $scope.animeEdicion.id);
        formData.append("titulo_oficial", $scope.animeEdicion.titulo_oficial || "");
        formData.append("sinopsis", $scope.animeEdicion.sinopsis || "");
        ($scope.animeEdicion.generos_ids || []).forEach(function (gid) {
            formData.append("generos_ids[]", gid);
        });
        if ($scope.nuevaPortadaFile) formData.append("portada", $scope.nuevaPortadaFile);

        $http.post(url("index.php?editar_anime"), formData, {
            transformRequest: angular.identity,
            headers: { "Content-Type": undefined }
        }).then(function (response) {
            $scope.guardandoEdicion = false;
            if (response.data.success) {
                $scope.modalEditarVisible = false;
                $scope.cargarRegistrados();
            } else {
                alert("Error: " + response.data.mensaje);
            }
        }, function () {
            $scope.guardandoEdicion = false;
            alert("Error de red al guardar los cambios.");
        });
    };

    // --- ELIMINAR ---
    $scope.modalEliminarVisible = false;
    $scope.animeEliminacion = { id: null, titulo: "", notificar: true };
    $scope.cargandoEliminar = false;

    $scope.eliminarAnime = function (anime) {
        $scope.animeEliminacion = {
            id: anime.id,
            titulo: anime.titulo_oficial || anime.titulo_carpeta,
            borrar_imagen: true,
            notificar: true
        };
        $scope.modalEliminarVisible = true;
    };

    $scope.cerrarModalEliminar = function () {
        $scope.modalEliminarVisible = false;
    };

    $scope.confirmarEliminar = function () {
        $scope.cargandoEliminar = true;

        $http.post(url("index.php?eliminar_anime"), $scope.animeEliminacion).then(function (response) {
            $scope.cargandoEliminar = false;
            if (response.data.success) {
                $scope.modalEliminarVisible = false;
                $scope.cargarRegistrados();
                console.log("Debug Push:", response.data.firebase_debug);
            } else {
                alert("Error: " + response.data.mensaje);
            }
        }, function () {
            $scope.cargandoEliminar = false;
            alert("Error de red al intentar eliminar.");
        });
    };
});

// --- CONTROLADOR PARA LA BIBLIOTECA ---

app.controller("bibliotecaCtrl", function ($scope, $http) {
    console.log("Módulo Biblioteca listo");

    $scope.animes = [];
    $scope.animesEnPagina = [];
    $scope.numeroPaginas = [];
    $scope.generosFiltro = [];
    $scope.cargandoBD = true;
    $scope.urlServidor = "https://untalhaize.xyz/Coryn/";
    $scope.paginaActual = 1;
    $scope.totalPags = 0;
    $scope.busqueda = "";
    $scope.generoActivo = "";
    var porPagina = 24;

   
    $scope.jwt = localStorage.getItem("jwt");

    $scope.portadaUrl = function (anime) {
        return anime.ruta_portada
            ? url("index.php?portada&ruta=" + anime.ruta_portada + "&token=" + $scope.jwt)
            : "assets/img/default-cover.jpg";
    };

    // Aplica búsqueda + filtro de género y recalcula paginación
    function aplicarFiltros() {
        var filtrados = $scope.animes.filter(function (a) {
            var tituloMostrado = (a.titulo_oficial || a.titulo_carpeta || "").toLowerCase();
            var coincideBusqueda = !$scope.busqueda ||
                tituloMostrado.indexOf($scope.busqueda.toLowerCase()) !== -1;
            var coincideGenero = !$scope.generoActivo ||
                (a.generos && a.generos.indexOf($scope.generoActivo) !== -1);
            return coincideBusqueda && coincideGenero;
        });

        $scope.paginaActual = 1;
        $scope.totalPags = Math.ceil(filtrados.length / porPagina);
        $scope.animesEnPagina = filtrados.slice(0, porPagina);
        $scope._filtrados = filtrados;

        var arr = [];
        for (var i = 1; i <= $scope.totalPags; i++) arr.push(i);
        $scope.numeroPaginas = arr;
    }

    function extraerGeneros(animes) {
        var set = {};
        animes.forEach(function (a) {
            if (!a.generos) return;
            a.generos.split(', ').forEach(function (g) {
                var g = g.trim();
                if (g) set[g] = true;
            });
        });
        $scope.generosFiltro = Object.keys(set).sort();
    }

    $scope.cargarAnimes = function () {
        $http.get(url("index.php?obtener_animes")).then(function (response) {
            $scope.cargandoBD = false;
            if (response.data.success) {
                $scope.animes = response.data.data;
                extraerGeneros($scope.animes);
                aplicarFiltros();
            }
        }, function (error) {
            $scope.cargandoBD = false;
            console.error("Error al obtener biblioteca", error);
        });
    };

    $scope.cargarAnimes();

    $scope.onBusqueda = function () { aplicarFiltros(); };

    $scope.toggleGenero = function (genero) {
        $scope.generoActivo = ($scope.generoActivo === genero) ? "" : genero;
        aplicarFiltros();
    };

    $scope.limpiarFiltros = function () {
        $scope.busqueda = "";
        $scope.generoActivo = "";
        aplicarFiltros();
    };

    $scope.irAPagina = function (n) {
        if (n < 1 || n > $scope.totalPags) return;
        $scope.paginaActual = n;
        var inicio = (n - 1) * porPagina;
        $scope.animesEnPagina = $scope._filtrados.slice(inicio, inicio + porPagina);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    $scope.verDetalles = function (id) {
        window.location.href = "#/anime/" + id;
    };




    $scope.nuevoPin = "";
    $scope.tienePin = false;
    $scope.mostrarPin = false;

    // Verificar si el usuario ya tiene un PIN
    $http.get(url("index.php?estado_pin")).then(function (r) {
        if (r.data.success) {
            $scope.tienePin = !!r.data.tienePin;
        }
    });

    $scope.togglePin = function () {
        $scope.mostrarPin = !$scope.mostrarPin;
    };

    $scope.guardarPIN = function () {
        if (!$scope.nuevoPin || $scope.nuevoPin.length !== 4) {
            alert("El PIN debe tener exactamente 4 dígitos.");
            return;
        }

        $http.post(url("index.php?guardar_pin"), { pin: $scope.nuevoPin }).then(function (r) {
            if (r.data.success) {
                alert("PIN guardado correctamente.");
                $scope.tienePin = true;
                $scope.nuevoPin = "";
            } else {
                alert(r.data.mensaje || "Error al guardar el PIN");
            }
        });
    };

    const fcmPlugin = window.FirebasexMessaging || window.FirebasePlugin || (window.cordova && cordova.plugins && cordova.plugins.firebase && cordova.plugins.firebase.messaging);
    if (fcmPlugin && typeof obtenerFBToken === "function") {
        obtenerFBToken();
    }
    $scope.quitarPin = function () {
        if (!confirm("¿Seguro que deseas eliminar tu PIN de acceso?")) return;

        $http.post(url("index.php?quitar_pin")).then(function (r) {
            if (r.data.success) {
                alert("PIN eliminado. Tendrás que usar tu contraseña.");
                $scope.tienePin = false;
                $scope.nuevoPin = "";
            } else {
                alert(r.data.mensaje || "Error al quitar el PIN");
            }
        });
    };

});

// --- CONTROLADOR PARA FAVORITOS / PENDIENTES / VIENDO / VISTOS ---

app.controller("listaCtrl", function ($scope, $http, $route, $location) {
    console.log("Módulo Lista listo");

    const filtro = $route.current.filtro;

    const titulos = {
        favoritos: "FAVORITOS",
        pendientes: "PENDIENTES",
        viendo: "VIENDO",
        vistos: "VISTOS"
    };

    $scope.tituloLista = titulos[filtro] || "";
    $scope.cargando = true;
    $scope.animesLista = [];
    $scope.jwt = localStorage.getItem("jwt");

    $scope.portadaUrl = function (anime) {
        return anime.ruta_portada
            ? url("index.php?portada&ruta=" + anime.ruta_portada + "&token=" + $scope.jwt)
            : "assets/img/default-cover.jpg";
    };


    function coincideFiltro(anime) {
        if (filtro === "favoritos") return anime.favorito;
        if (filtro === "pendientes") return anime.estado_usuario === "Pendiente";
        if (filtro === "viendo") return anime.estado_usuario === "Viendo";
        if (filtro === "vistos") return anime.estado_usuario === "Visto";
        return false;
    }

    $http.get(url("index.php?obtener_animes")).then(function (response) {
        $scope.cargando = false;
        if (response.data.success) {
            $scope.animesLista = response.data.data.filter(coincideFiltro);
        }
    }, function (error) {
        $scope.cargando = false;
        console.error("Error al obtener la lista", error);
    });

    $scope.verDetalles = function (id) {
        $location.path("/anime/" + id);
    };
});

// --- CONTROLADOR PARA EL DETALLE ---

app.controller("detalleCtrl", function ($scope, $http, $routeParams, $sce) {
    console.log("Módulo Detalles listo. ID:", $routeParams.id);

    $scope.urlServidor = "https://untalhaize.xyz/Coryn/";
    $scope.cargando = true;
    $scope.anime = null;
    $scope.episodios = [];
    $scope.videoUrl = null;
    $scope.reproductorVisible = false;

    $scope.jwt = localStorage.getItem("jwt");

    $scope.portadaUrl = function (anime) {
        return anime && anime.ruta_portada
            ? url("index.php?portada&ruta=" + anime.ruta_portada + "&token=" + $scope.jwt)
            : "assets/img/default-cover.jpg";
    };

    const idAnime = $routeParams.id;

    $scope.cargarDetalles = function () {
        $http.get(url("index.php?obtener_detalle&id=" + idAnime)).then(function (response) {
            if (response.data.success) {
                $scope.anime = response.data.data;
                $scope.anime.favorito = $scope.anime.favorito == 1;
                $scope.cargarEpisodios();
            } else {
                alert(response.data.mensaje);
            }
        });
    };

    $scope.cargarEpisodios = function () {
        $http.get(url("index.php?obtener_episodios&id=" + idAnime)).then(function (response) {
            $scope.cargando = false;
            if (response.data.success) {
                $scope.episodios = response.data.data;
            }
        });
    };

    $scope.toggleFavorito = function () {
        $scope.anime.favorito = !$scope.anime.favorito;
        $scope.guardarProgreso({ favorito: $scope.anime.favorito ? 1 : 0 });
    };

    $scope.cambiarEstado = function () {
        $scope.guardarProgreso({ estado: $scope.anime.estado_usuario });
    };

    $scope.guardarProgreso = function (datosAActualizar) {
        const payload = Object.assign({ anime_id: idAnime }, datosAActualizar);
        $http.post(url("index.php?actualizar_estado"), payload).then(function (response) {
            console.log("Progreso guardado:", response.data.mensaje);
        }, function (error) {
            console.error("Error al guardar progreso:", error);
        });
    };

    $scope.reproducir = function (episodio) {
        var urlVideo = url("index.php?stream&id=" + idAnime
            + "&file=" + encodeURIComponent(episodio.nombre_archivo)
            + "&token=" + $scope.jwt);

        console.log("URL del video:", urlVideo);

        $scope.videoUrl = $sce.trustAsResourceUrl(urlVideo);
        $scope.reproductorVisible = true;

        setTimeout(function () {
            var el = document.getElementById("reproductor-destino");
            if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    $scope.cerrarReproductor = function () {
        $scope.videoUrl = null;
        $scope.reproductorVisible = false;
    };

    $scope.cargarDetalles();
});

// --- CONTROLADOR PARA EL LOGIN ---

app.controller("loginCtrl", function ($scope, $http, $location, $rootScope, $interval) {
    $scope.datos = {
        usuario: "",
        clave: "",
        pin: ""
    };

    $scope.error = "";
    $scope.cargando = false;

    // Variables para el QR
    $scope.mostrarQR = false;
    $scope.qrImagen = null;

    var sessionId = null;
    var polling = null;

    $scope.login = function () {
        $scope.error = "";

        //Debe ingresar el usuario
        if (!$scope.datos.usuario) {
            $scope.error = "Por favor ingresa tu usuario.";
            return;
        }

        //Debe haber ingresado la clave o el pin
        if (!$scope.datos.clave && !$scope.datos.pin) {
            $scope.error = "Ingresa tu contraseña o tu PIN.";
            return;
        }

        $scope.cargando = true;

        // Construimos el JSON leyendo del objeto "datos"
        const payload = {
            usuario: $scope.datos.usuario,
            contrasena: $scope.datos.clave,
            pin: $scope.datos.pin
        };

        $http.post(url("index.php?login"), payload).then(function (res) {
            $scope.cargando = false;

            if (res.data.success) {
                localStorage.setItem("jwt", res.data.token);
                $rootScope.actualizarSesion();

                const fcmPlugin = window.FirebasexMessaging || window.FirebasePlugin || (window.cordova && cordova.plugins && cordova.plugins.firebase && cordova.plugins.firebase.messaging);
                if (fcmPlugin && typeof obtenerFBToken === "function") {
                    obtenerFBToken();
                }

                $location.path("/biblioteca");
            } else {
                $scope.error = res.data.mensaje;
                $scope.datos.pin = "";
            }
        }, function () {
            $scope.cargando = false;
            $scope.error = "Error de conexión con el servidor.";
        });
    };

    $scope.toggleQR = function () {
        $scope.mostrarQR = !$scope.mostrarQR;
        $scope.error = "";
        $scope.mostrarQR ? iniciarQR() : detenerPolling();
    };

    function iniciarQR() {
        $scope.qrImagen = null;
        sessionId = null;

        $http.get(url("index.php?generar_qr")).then(function (res) {
            if (!res.data.success) { $scope.error = "No se pudo generar el QR."; return; }
            sessionId = res.data.session_id;
            $scope.qrImagen = url("index.php?qr_imagen&session_id=" + sessionId);
            polling = $interval(consultarEstado, 2500);
        });
    }

    function consultarEstado() {
        if (!sessionId) return;
        $http.get(url("index.php?estado_qr&session_id=" + sessionId)).then(function (res) {
            if (res.data.success && res.data.estado === "confirmado") {
                detenerPolling();
                localStorage.setItem("jwt", res.data.token);
                $rootScope.actualizarSesion();
                $location.path("/biblioteca");
            }
        });
    }

    function detenerPolling() {
        if (polling) { $interval.cancel(polling); polling = null; }
    }

    $scope.$on("$destroy", function () {
        if (polling) detenerPolling();
    });
});

// --- CONTROLADOR PARA CONFIRMAR QR ---

app.controller("confirmarCtrl", function ($scope, $http, $routeParams) {

    $scope.estado = "confirmando";

    if (!localStorage.getItem("jwt")) {
        $scope.estado = "error";
        $scope.mensaje = "Inicia sesión en este dispositivo primero.";
        return;
    }


    $http.post(url("index.php?confirmar_qr"), { session_id: $routeParams.session }).then(function (res) {
        $scope.estado = res.data.success ? "ok" : "error";
        $scope.mensaje = res.data.mensaje;
    }, function (err) {
        $scope.estado = "error";
        $scope.mensaje = "Error de conexión.";
    });
});