<?php
// Simple Spotify OAuth callback handler
// Upload this to https://rexheng.com/callback.php

// Get the authorization code from the URL
$auth_code = isset($_GET['code']) ? $_GET['code'] : null;
$error = isset($_GET['error']) ? $_GET['error'] : null;
$state = isset($_GET['state']) ? $_GET['state'] : null;

// Get the full callback URL
$full_url = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http") . "://$_SERVER[HTTP_HOST]$_SERVER[REQUEST_URI]";
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Spotify Authorization - Rex Heng</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #1DB954 0%, #191414 100%);
            color: white;
            margin: 0;
            padding: 20px;
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        .container {
            background: rgba(25, 20, 20, 0.95);
            padding: 2rem;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            text-align: center;
            max-width: 700px;
            margin: 20px;
        }
        .header {
            border-bottom: 2px solid #1DB954;
            padding-bottom: 1rem;
            margin-bottom: 2rem;
        }
        .spotify-logo {
            font-size: 2rem;
            font-weight: bold;
            color: #1DB954;
            margin-bottom: 0.5rem;
        }
        .success-icon {
            font-size: 4rem;
            color: #1DB954;
            margin-bottom: 1rem;
        }
        .error-icon {
            font-size: 4rem;
            color: #ff6b6b;
            margin-bottom: 1rem;
        }
        .code-container {
            background: #282828;
            border: 2px solid #404040;
            border-radius: 8px;
            padding: 1.5rem;
            margin: 1.5rem 0;
            font-family: 'Courier New', monospace;
            word-break: break-all;
            font-size: 0.9rem;
            position: relative;
        }
        .instructions {
            background: rgba(29, 185, 84, 0.15);
            border-left: 4px solid #1DB954;
            padding: 1.5rem;
            margin: 1.5rem 0;
            text-align: left;
            border-radius: 4px;
        }
        .error-box {
            background: rgba(255, 107, 107, 0.15);
            border-left: 4px solid #ff6b6b;
            padding: 1.5rem;
            margin: 1.5rem 0;
            border-radius: 4px;
        }
        .copy-btn {
            background: #1DB954;
            color: white;
            border: none;
            padding: 0.8rem 1.5rem;
            border-radius: 25px;
            cursor: pointer;
            margin: 0.5rem;
            font-weight: bold;
            font-size: 1rem;
            transition: all 0.3s;
            display: inline-block;
        }
        .copy-btn:hover {
            background: #1ed760;
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(29, 185, 84, 0.3);
        }
        .step-number {
            background: #1DB954;
            color: white;
            border-radius: 50%;
            width: 30px;
            height: 30px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin-right: 10px;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="spotify-logo">🎵 Spotify API Callback</div>
            <p>Rex Heng's Financial Crisis Playlist Creator</p>
        </div>

        <?php if ($error): ?>
            <!-- Error Case -->
            <div class="error-icon">❌</div>
            <h2>Authorization Failed</h2>
            <div class="error-box">
                <p><strong>Error:</strong> <?php echo htmlspecialchars($error); ?></p>
                <p>Please return to your Python script and try the authorization again.</p>
            </div>
            
        <?php elseif ($auth_code): ?>
            <!-- Success Case -->
            <div class="success-icon">✅</div>
            <h2>Authorization Successful!</h2>
            <p>Your Spotify Financial Crisis Playlist Creator has been authorized.</p>
            
            <div class="instructions">
                <h3><span class="step-number">1</span>Copy this complete URL:</h3>
            </div>
            
            <div class="code-container">
                <div id="fullUrl"><?php echo htmlspecialchars($full_url); ?></div>
            </div>
            <button class="copy-btn" onclick="copyToClipboard('<?php echo htmlspecialchars($full_url); ?>')">
                📋 Copy Full URL
            </button>
            
            <div class="instructions">
                <h3><span class="step-number">2</span>Return to your Python terminal</h3>
                <p>Paste the URL above when you see: <code>"Enter the URL you were redirected to:"</code></p>
            </div>
            
            <div class="instructions">
                <h3><span class="step-number">3</span>Your playlist creator will continue!</h3>
                <p>The script will now:</p>
                <ul>
                    <li>🔍 Search for songs from financial crises</li>
                    <li>📝 Create themed playlists</li>
                    <li>🎵 Add tracks to your Spotify account</li>
                </ul>
            </div>

            <hr style="border: 1px solid #404040; margin: 2rem 0;">
            
            <details style="text-align: left; margin-top: 2rem;">
                <summary style="cursor: pointer; font-weight: bold; color: #1DB954;">🔧 Technical Details</summary>
                <div style="margin-top: 1rem; font-size: 0.9rem; color: #ccc;">
                    <p><strong>Authorization Code:</strong></p>
                    <div style="background: #1a1a1a; padding: 1rem; border-radius: 4px; font-family: monospace; word-break: break-all;">
                        <?php echo htmlspecialchars($auth_code); ?>
                    </div>
                    <p style="margin-top: 1rem;"><strong>State:</strong> <?php echo $state ? htmlspecialchars($state) : 'None'; ?></p>
                </div>
            </details>

        <?php else: ?>
            <!-- Unexpected Case -->
            <div class="error-icon">❓</div>
            <h2>Unexpected Response</h2>
            <div class="error-box">
                <p>No authorization code or error was received from Spotify.</p>
                <p><strong>Current URL:</strong> <?php echo htmlspecialchars($full_url); ?></p>
                <p>Please try the authorization process again from your Python script.</p>
            </div>
        <?php endif; ?>
    </div>

    <script>
        function copyToClipboard(text) {
            navigator.clipboard.writeText(text).then(function() {
                const btn = event.target;
                const originalText = btn.innerHTML;
                btn.innerHTML = '✅ Copied!';
                btn.style.background = '#1ed760';
                setTimeout(() => {
                    btn.innerHTML = originalText;
                    btn.style.background = '#1DB954';
                }, 2000);
            }, function(err) {
                console.error('Could not copy text: ', err);
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = text;
                document.body.appendChild(textArea);
                textArea.select();
                try {
                    document.execCommand('copy');
                    const btn = event.target;
                    const originalText = btn.innerHTML;
                    btn.innerHTML = '✅ Copied!';
                    setTimeout(() => {
                        btn.innerHTML = originalText;
                    }, 2000);
                } catch (err) {
                    alert('Please manually copy the URL above');
                }
                document.body.removeChild(textArea);
            });
        }
    </script>
</body>
</html>