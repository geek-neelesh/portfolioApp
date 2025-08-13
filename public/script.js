// Check URL parameters for Spotify connection status
window.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const spotifyConnected = urlParams.get('spotify_connected');
    const spotifyError = urlParams.get('spotify_error');
    const statusDiv = document.getElementById('spotify-status');
    const viewDataBtn = document.getElementById('view-data-btn');
    const connectBtn = document.querySelector('a[href="/api/v1/spotify/login"]');

    if (spotifyConnected === 'true') {
        // Show success message
        statusDiv.innerHTML = `
            <strong>✅ Spotify Connected Successfully!</strong>
            <p>You can now view your Spotify data and control playback.</p>
        `;
        statusDiv.style.backgroundColor = '#d4edda';
        statusDiv.style.color = '#155724';
        statusDiv.style.border = '1px solid #c3e6cb';
        statusDiv.style.display = 'block';

        // Show view data button, hide connect button
        if (viewDataBtn) viewDataBtn.style.display = 'inline-block';
        if (connectBtn) connectBtn.style.display = 'none';

        // Clear URL parameters after showing message
        setTimeout(() => {
            window.history.replaceState({}, document.title, window.location.pathname);
        }, 100);

    } else if (spotifyError) {
        // Show error message
        statusDiv.innerHTML = `
            <strong>❌ Spotify Connection Failed</strong>
            <p>Error: ${decodeURIComponent(spotifyError)}</p>
            <p>Please try connecting again.</p>
        `;
        statusDiv.style.backgroundColor = '#f8d7da';
        statusDiv.style.color = '#721c24';
        statusDiv.style.border = '1px solid #f5c6cb';
        statusDiv.style.display = 'block';

        // Clear URL parameters after showing message
        setTimeout(() => {
            window.history.replaceState({}, document.title, window.location.pathname);
        }, 100);
    }

    // Auto-hide status message after 5 seconds
    if (spotifyConnected || spotifyError) {
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 5000);
    }
});
