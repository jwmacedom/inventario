// CONFIGURACIÓN DE SUPABASE
const SUPABASE_URL = "https://fnnbiavucfgjqyrepzkw";
const SUPABASE_KEY = "sb_publishable_L6F_zQiQS08gVeas9ePvqQ_4MDWO0RQ";
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ELEMENTOS DEL DOM
const loginContainer = document.getElementById('login-container');
const appContainer = document.getElementById('app-container');
const loginForm = document.getElementById('login-form');
const inventarioForm = document.getElementById('inventario-form');
const listaProductos = document.getElementById('lista-productos');
const btnLogout = document.getElementById('btn-logout');

let usuarioActual = null;

// 1. CONTROL DE SESIÓN (LOGIN / LOGOUT)
supabase.auth.onAuthStateChange((event, session) => {
    if (session) {
        usuarioActual = session.user;
        loginContainer.classList.add('hidden');
        appContainer.classList.remove('hidden');
        cargarProductos();
    } else {
        usuarioActual = null;
        loginContainer.classList.remove('hidden');
        appContainer.classList.add('hidden');
    }
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert("Error: " + error.message);
});

btnLogout.addEventListener('click', async () => {
    await supabase.auth.signOut();
});

// 2. GUARDAR PRODUCTO E INVENTARIO
inventarioForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const producto = document.getElementById('producto').value;
    const donde_compro = document.getElementById('donde_compro').value;
    const tienda = document.getElementById('tienda').value;
    const fecha = document.getElementById('fecha').value;
    const precio_real = document.getElementById('precio_real').value;
    const precio_boleta = document.getElementById('precio_boleta').value;
    const archivoInput = document.getElementById('archivo').files[0];

    let archivoUrl = null;

    // Subir archivo si existe
    if (archivoInput) {
        const fileExt = archivoInput.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${usuarioActual.id}/${fileName}`;

        const { data, error: uploadError } = await supabase.storage
            .from('comprobantes')
            .upload(filePath, archivoInput);

        if (uploadError) {
            alert("Error al subir archivo: " + uploadError.message);
            return;
        }

        // Obtener URL pública del archivo
        const { data: urlData } = supabase.storage.from('comprobantes').getPublicUrl(filePath);
        archivoUrl = urlData.publicUrl;
    }

    // Insertar en la base de datos
    const { error } = await supabase.from('inventario').insert([
        {
            usuario_id: usuarioActual.id,
            producto,
            donde_compro,
            tienda,
            fecha,
            precio_real: precio_real ? parseFloat(precio_real) : null,
            precio_boleta: precio_boleta ? parseFloat(precio_boleta) : null,
            archivo_url: archivoUrl
        }
    ]);

    if (error) {
        alert("Error al guardar: " + error.message);
    } else {
        alert("¡Producto guardado con éxito!");
        inventarioForm.reset();
        cargarProductos();
    }
});

// 3. CARGAR Y MOSTRAR PRODUCTOS
async function cargarProductos() {
    listaProductos.innerHTML = "Cargando...";
    
    const { data, error } = await supabase
        .from('inventario')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        listaProductos.innerHTML = "Error al cargar datos.";
        return;
    }

    listaProductos.innerHTML = "";
    data.forEach(item => {
        const div = document.createElement('div');
        div.className = 'item-producto';
        div.innerHTML = `
            <strong>${item.producto}</strong><br>
            <small>Tienda: ${item.tienda || 'N/A'} (${item.donde_compro || 'N/A'})</small><br>
            <small>Fecha: ${item.fecha || 'N/A'}</small><br>
            <small>Precio Real: $${item.precio_real || '0'} | Boleta: $${item.precio_boleta || '0'}</small><br>
            ${item.archivo_url ? `<a href="${item.archivo_url}" target="_blank">📄 Ver Comprobante</a>` : 'Sin archivo'}
        `;
        listaProductos.appendChild(div);
    });
}
