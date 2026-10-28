document.addEventListener("deviceready", onDeviceReady, false);
document.addEventListener("resume", decoradorObtenerFBToken);

function getFCM() {
    return window.FirebasexMessaging
        || window.FirebasePlugin
        || (window.cordova && cordova.plugins && cordova.plugins.firebase && cordova.plugins.firebase.messaging);
}

function onDeviceReady() {
    if (getFCM()) {
        fb();
    } else {
        esperarFirebasePlugin();
    }
}

function fb() {
    decoradorObtenerFBToken();
    const fcm = getFCM();

    fcm.onTokenRefresh(function (token) {
        registrarTokenEnBD(token);
    }, function (error) {
        console.error("Error al refrescar token FCM:", error);
    });

    fcm.onMessageReceived(function (message) {
        console.log("Notificación recibida:", message.body || "Sin mensaje");
    });
}

function obtenerFBToken() {
    const fcm = getFCM();
    if (!fcm) return;

    fcm.getToken(function (token) {
        if (token) registrarTokenEnBD(token);
    }, function (error) {
        console.error("Error al obtener token FCM:", error);
    });
}

function registrarTokenEnBD(token) {
    // alert("¡FCM nos dio un token!: " + token.substring(0, 20) + "..."); // PRUEBA 1

    const jwt = localStorage.getItem("jwt");
    if (!jwt) {
        // alert("El token se genero, pero no hay JWT");
        return;
    }

    //alert("fetch para registrar el token"); // PRUEBA 2

    fetch(API_BASE_URL + "index.php?registrar_token", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + jwt
        },
        body: JSON.stringify({ token: token })
    })
        .then(res => res.json())
        .then(data => {
            console.log("Token FCM registrado:", data);
        })
        .catch(err => {
            // alert("Tronó el Fetch: " + err); // PRUEBA ERROR
            console.error("Error al registrar token:", err);
        });
}

function decoradorObtenerFBToken() {
    const fcm = getFCM();
    if (!fcm) return;

    fcm.hasPermission(function (granted) {
        if (!granted) {
            fcm.grantPermission(function () {
                obtenerFBToken();
            }, function (error) {
                console.error("Permiso denegado:", error);
            });
            return;
        }
        obtenerFBToken();
    });
}

function esperarFirebasePlugin() {
    if (getFCM()) {
        fb();
    } else {
        setTimeout(esperarFirebasePlugin, 1000);
    }
}

window.handleOpenURL = function (url) {
    const match = url.match(/session=([a-f0-9]+)/);
    if (match) {
        setTimeout(function () {
            if (typeof window.navegarDesdeDeepLink === "function") {
                window.navegarDesdeDeepLink(match[1]);
            } else {
                console.error("navegarDesdeDeepLink no está definida todavía.");
            }
        }, 300);
    }
};