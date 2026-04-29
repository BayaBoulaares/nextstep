// // app/api/vnc-proxy/route.ts
// import { NextRequest, NextResponse } from "next/server"

// export async function GET(req: NextRequest) {
//   const { searchParams } = new URL(req.url)
//   const vm  = searchParams.get("vm")  ?? "vm"
//   const url = searchParams.get("url") ?? ""

//   const wsUrl = url.startsWith("/")
//     ? `ws://localhost:8081${url}`
//     : url.replace("https://", "wss://").replace("http://", "ws://")

//   const html = `<!DOCTYPE html>
// <html>
// <head>
//   <title>Console — ${vm}</title>
//   <meta charset="utf-8">
//   <style>
//     * { margin:0; padding:0; box-sizing:border-box; }
//     html, body { width:100%; height:100%; background:#1a1a1a; overflow:hidden; }
//     #screen { width:100%; height:100%; }
//     #status {
//       position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);
//       color:#888; font:13px/1.5 monospace; text-align:center;
//     }
//   </style>
// </head>
// <body>
//   <div id="screen"></div>
//   <div id="status">Connexion VNC en cours…</div>

//   <script type="module">
//     let RFB
//     try {
//       const mod = await import('https://cdn.jsdelivr.net/npm/@novnc/novnc@1.4.0/core/rfb.js')
//       RFB = mod.default
//     } catch(e) {
//       document.getElementById('status').innerHTML =
//         '<span style="color:#f66">Erreur noVNC : ' + e.message + '</span>'
//       throw e
//     }

//     const screen = document.getElementById('screen')
//     const status = document.getElementById('status')
//     const wsUrl  = '${wsUrl}'

//     console.log('[VNC] wsUrl:', wsUrl)

//     try {
//       const rfb = new RFB(screen, wsUrl, {
//         credentials: { password: '' },
//       })

//       rfb.scaleViewport = true
//       rfb.resizeSession = true
//       rfb.viewOnly      = false

//       rfb.addEventListener('connect', () => {
//         status.style.display = 'none'
//         console.log('[VNC] Connecté ✅')
//       })

//       rfb.addEventListener('disconnect', (e) => {
//         status.style.display = 'block'
//         status.innerHTML = e.detail?.clean
//           ? 'Session terminée.'
//           : '<span style="color:#f66">Déconnecté : ' + (e.detail?.reason ?? 'inconnu') + '</span>'
//       })

//       rfb.addEventListener('credentialsrequired', () => {
//         const pw = prompt('Mot de passe VNC :')
//         if (pw !== null) rfb.sendCredentials({ password: pw })
//       })

//       rfb.addEventListener('securityfailure', (e) => {
//         status.innerHTML = '<span style="color:#f66">Échec sécurité : ' + e.detail?.reason + '</span>'
//       })

//     } catch(e) {
//       status.innerHTML = '<span style="color:#f66">Erreur VNC : ' + e.message + '</span>'
//       console.error('[VNC]', e)
//     }
//   </script>
// </body>
// </html>`

//   return new NextResponse(html, {
//     headers: {
//       "Content-Type":            "text/html",
//       "Content-Security-Policy": "default-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net wss: ws:; connect-src *",
//       "X-Frame-Options":         "SAMEORIGIN",
//     }
//   })
// }
// app/api/vnc-proxy/route.ts
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const vm    = searchParams.get("vm")  ?? "vm"   // ✅ vm est défini ici
  const url   = searchParams.get("url") ?? ""

  const wsUrl = url.startsWith("/")
    ? `ws://localhost:8081${url}`
    : url.replace("https://", "wss://").replace("http://", "ws://")

  const html = `<!DOCTYPE html>
<html>
<head>
  <title>Console — ${vm}</title>
  <meta charset="utf-8">
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html, body { width:100%; height:100%; background:#1a1a1a; overflow:hidden; }
    #screen { width:100%; height:100%; }
    #status {
      position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);
      color:#888; font:13px/1.5 monospace; text-align:center;
    }
  </style>
</head>
<body>
  <div id="screen"></div>
  <div id="status">Connexion VNC en cours…</div>

  <script type="module">
    let RFB
    try {
      const mod = await import('https://cdn.jsdelivr.net/npm/@novnc/novnc@1.4.0/core/rfb.js')
      RFB = mod.default
    } catch(e) {
      document.getElementById('status').innerHTML =
        '<span style="color:#f66">Erreur noVNC : ' + e.message + '</span>'
      throw e
    }

    const screen = document.getElementById('screen')
    const status = document.getElementById('status')
    const wsUrl  = '${wsUrl}'

    console.log('[VNC] wsUrl:', wsUrl)

    let rfb = null
    let reconnectTimer = null

    function connect() {
      try {
        rfb = new RFB(screen, wsUrl, {
          credentials: { password: '' },
        })

        rfb.scaleViewport = true
        rfb.resizeSession = true
        rfb.viewOnly      = false

        rfb.addEventListener('connect', () => {
          status.style.display = 'none'
          if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null }
          console.log('[VNC] Connecté ✅')
        })

        rfb.addEventListener('disconnect', (e) => {
          status.style.display = 'block'
          if (e.detail?.clean) {
            status.innerHTML = 'Session terminée.'
          } else {
            status.innerHTML = '<span style="color:#f66">Reconnexion en cours…</span>'
            reconnectTimer = setTimeout(connect, 2000)
          }
        })

        rfb.addEventListener('credentialsrequired', () => {
          const pw = prompt('Mot de passe VNC :')
          if (pw !== null) rfb.sendCredentials({ password: pw })
        })

        rfb.addEventListener('securityfailure', (e) => {
          status.innerHTML = '<span style="color:#f66">Échec sécurité : ' + e.detail?.reason + '</span>'
        })

      } catch(e) {
        status.innerHTML = '<span style="color:#f66">Erreur VNC : ' + e.message + '</span>'
        console.error('[VNC]', e)
      }
    }

    connect()
  </script>
</body>
</html>`

  return new NextResponse(html, {
    headers: {
      "Content-Type":            "text/html",
      "Content-Security-Policy": "default-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net wss: ws:; connect-src *",
      "X-Frame-Options":         "SAMEORIGIN",
    }
  })
}