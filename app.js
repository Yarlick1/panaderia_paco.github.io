// ======================================================================
// ⚠️ CONFIGURACIÓN CLAVE - DEBES CAMBIAR ESTOS VALORES ⚠️
// ======================================================================

// 1. CLOUDINARY: Tu Cloud Name (ej: 'djdg7922d'). Obténlo al crear tu cuenta gratuita.
const CLOUDINARY_CLOUD_NAME = "daxothobr"; 
// 2. CLOUDINARY: El Preset de Subida. DEBE ser 'Unsigned' para seguridad.
const CLOUDINARY_UPLOAD_PRESET = "boda_preset";

// 3. GOOGLE APPS SCRIPT: La URL de tu Despliegue de la API de Google Sheets.
const SCRIPT_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyKTqJuXFLjZSdULXDcvthHsxOaL0ojwm-j2C2_StlR48M9cawyhJ71SlKQ5qTIRVs1Uw/exec";

// ======================================================================
const photoContainer = document.getElementById('photo-container');
const loadingMessage = document.getElementById('loading-message');
const uploadModal = document.getElementById('upload-modal');
const uploadBtn = document.getElementById('upload-btn');
const uploadForm = document.getElementById('upload-form');
const submitBtn = document.getElementById('submit-btn');
const statusMessage = document.getElementById('status-message');

// NUEVOS ELEMENTOS LIGHTBOX
const lightboxModal = document.getElementById('lightbox-modal');
const lightboxImage = document.getElementById('lightbox-image');

let lastPhotoCount = 0;

// --- 1. LÓGICA DE LA GALERÍA (POLLING Y LIGHTBOX) ---

/**
 * Muestra la imagen seleccionada en el modal de pantalla completa.
 */
function openLightbox(imageUrl) {
    lightboxImage.src = imageUrl;
    lightboxModal.classList.remove('hidden');
    lightboxModal.classList.add('flex');
}

/**
 * Cierra el modal de pantalla completa.
 */
function closeLightbox(event) {
    // Solo cierra si se da click en el fondo o en el botón 'X'
    if (!event || event.target === lightboxModal) {
        lightboxModal.classList.add('hidden');
        lightboxModal.classList.remove('flex');
    }
}
// Hacemos la función global para que pueda ser llamada desde el onclick del HTML del Lightbox.
window.closeLightbox = closeLightbox; 


/**
 * Carga las fotos desde Google Sheets y las hace clicables.
 */
async function fetchPhotos() {
    try {
        const response = await fetch(`${SCRIPT_WEB_APP_URL}?action=get`);
        if (!response.ok) throw new Error('Error al obtener las fotos');
        const data = await response.json();
        
        const photos = data.photos || []; 

        if (photos.length === lastPhotoCount) {
            return; 
        }

        if (photos.length > 0 && loadingMessage) {
            loadingMessage.classList.add('hidden');
        }

        photos.reverse(); 
        
        if (photos.length > lastPhotoCount) {
            photoContainer.innerHTML = ''; 

            photos.forEach(photo => {
                const photoDiv = document.createElement('div');
                photoDiv.className = 'bg-white rounded-lg shadow-md overflow-hidden cursor-pointer';

                // URL para la miniatura (w_400)
                const thumbnailImageUrl = photo.url.replace('/upload/', '/upload/w_400,c_scale/'); 
                // URL original para el lightbox (full screen)
                const fullImageUrl = photo.url; 
                
                photoDiv.innerHTML = `
                    <img src="${thumbnailImageUrl}" 
                         alt="Foto de invitado" 
                         loading="lazy" 
                         class="w-full h-auto object-cover transform hover:scale-105 transition duration-500"
                         data-full-url="${fullImageUrl}"> 
                `;
                
                // EVENT LISTENER PARA ABRIR EL LIGHTBOX
                photoDiv.querySelector('img').addEventListener('click', (e) => {
                    // Prevenimos que se active el scroll o cualquier otra cosa
                    e.preventDefault(); 
                    // Llamamos a la nueva función con la URL de alta resolución
                    openLightbox(e.target.getAttribute('data-full-url'));
                });
                
                photoContainer.appendChild(photoDiv);
            });
        }
        
        lastPhotoCount = photos.length;
        
    } catch (error) {
        console.error("Error fetching photos:", error);
        if (loadingMessage) {
            loadingMessage.textContent = 'Error al cargar las fotos. Intenta de nuevo.';
        }
    }
}

/**
 * Inicializa el sondeo (polling) para simular tiempo real.
 */
function initPolling() {
    fetchPhotos(); // Carga inicial
    setInterval(fetchPhotos, 5000); // Sondeo cada 5 segundos
}

// --- 2. LÓGICA DE SUBIDA (MODAL Y CLOUDINARY) ---
// ... (El código de openModal, closeModal, y handleUpload sigue siendo el mismo) ...

// Copia las funciones openModal, closeModal, y handleUpload del código anterior y pégalas aquí.

// El resto del código de app.js (subida de fotos) debe estar aquí

function openModal() {
    uploadModal.classList.remove('hidden');
    uploadModal.classList.add('flex');
    statusMessage.textContent = '';
    statusMessage.classList.add('hidden');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Compartir Recuerdo';
}

function closeModal(event) {
    if (event.target === uploadModal) {
        uploadModal.classList.add('hidden');
        uploadModal.classList.remove('flex');
        uploadForm.reset();
    }
}

async function handleUpload(event) {
    event.preventDefault();
    
    const fileInput = document.getElementById('photo-file');
    const file = fileInput.files[0];
    if (!file) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Subiendo... por favor espera.';
    statusMessage.textContent = '1/2 Subiendo la foto a la nube...';
    statusMessage.classList.remove('hidden');
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    
    try {
        const cloudinaryResponse = await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
            {
                method: 'POST',
                body: formData
            }
        );
        
        if (!cloudinaryResponse.ok) throw new Error('Error en Cloudinary');
        const cloudinaryData = await cloudinaryResponse.json();
        const photoUrl = cloudinaryData.secure_url;

        statusMessage.textContent = '2/2 Registrando en la galería...';
        
        const sheetsResponse = await fetch(SCRIPT_WEB_APP_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'add',
                url: photoUrl
            })
        });

        statusMessage.textContent = '¡Foto compartida con éxito! Refrescando galería...';
        
        await fetchPhotos(); 
        
        setTimeout(() => {
            uploadModal.classList.add('hidden');
            uploadModal.classList.remove('flex');
            uploadForm.reset();
        }, 1500);
        
    } catch (error) {
        console.error("Error during upload process:", error);
        statusMessage.textContent = `Error: ${error.message}. Vuelve a intentarlo.`;
        submitBtn.disabled = false;
        submitBtn.textContent = 'Reintentar Subir';
    }
}

// --- 3. INICIALIZACIÓN ---

document.addEventListener('DOMContentLoaded', () => {
    uploadBtn.addEventListener('click', openModal);
    uploadForm.addEventListener('submit', handleUpload);
    initPolling(); // Inicia la carga y el sondeo
});