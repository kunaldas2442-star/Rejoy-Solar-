<?php
/**
 * Hostinger Shared Hosting Gemini AI Proxy Endpoint
 * SolarPulse EPC ERP & CRM
 * 
 * Safely proxies prompts to Google Gemini API without exposing API keys to the browser.
 */
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');
header('X-XSS-Protection: 1; mode=block');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed. Use POST.']);
    exit;
}

// 1. Resolve GEMINI_API_KEY from environment or .env file
$apiKey = getenv('GEMINI_API_KEY') ?: ($_ENV['GEMINI_API_KEY'] ?? null);

if (!$apiKey) {
    $searchPaths = [
        __DIR__ . '/../../.env',
        __DIR__ . '/../.env',
        dirname(__DIR__, 2) . '/.env'
    ];
    foreach ($searchPaths as $path) {
        if (file_exists($path)) {
            $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ($lines as $line) {
                if (preg_match('/^\s*GEMINI_API_KEY\s*=\s*(.+)$/', $line, $matches)) {
                    $apiKey = trim($matches[1], "\"' \r\n");
                    break 2;
                }
            }
        }
    }
}

if (!$apiKey) {
    http_response_code(503);
    echo json_encode([
        'error' => 'GEMINI_API_KEY is not configured on the Hostinger server.',
        'help' => 'Please add GEMINI_API_KEY=your_key to your public_html/.env file or Hostinger Environment Variables.'
    ]);
    exit;
}

// 2. Parse incoming JSON request
$rawInput = file_get_contents('php://input');
$requestData = json_decode($rawInput, true);

$prompt = $requestData['prompt'] ?? null;
$systemInstruction = $requestData['systemInstruction'] ?? 'You are an expert Solar EPC and CRM AI assistant.';
$model = $requestData['model'] ?? 'gemini-2.5-flash';

if (!$prompt || !is_string($prompt)) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing "prompt" string in request body.']);
    exit;
}

if (strlen($prompt) > 10000) {
    http_response_code(400);
    echo json_encode(['error' => 'Prompt exceeds maximum allowed length of 10,000 characters.']);
    exit;
}

// 3. Prepare payload for Gemini Generative Language REST API
$geminiUrl = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$apiKey}";

$payload = [
    'contents' => [
        [
            'parts' => [
                ['text' => $prompt]
            ]
        ]
    ]
];

if (!empty($systemInstruction)) {
    $payload['systemInstruction'] = [
        'parts' => [
            ['text' => $systemInstruction]
        ]
    ];
}

$ch = curl_init($geminiUrl);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode($payload),
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json'
    ],
    CURLOPT_TIMEOUT => 45,
    CURLOPT_SSL_VERIFYPEER => true
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlErr = curl_error($ch);
curl_close($ch);

if ($curlErr) {
    http_response_code(500);
    echo json_encode(['error' => 'cURL error contacting Gemini API: ' . $curlErr]);
    exit;
}

$data = json_decode($response, true);

if ($httpCode >= 200 && $httpCode < 300 && isset($data['candidates'][0]['content']['parts'][0]['text'])) {
    $text = $data['candidates'][0]['content']['parts'][0]['text'];
    echo json_encode([
        'success' => true,
        'candidates' => $data['candidates'],
        'text' => $text
    ]);
} else {
    http_response_code($httpCode >= 400 ? $httpCode : 500);
    echo json_encode([
        'error' => $data['error']['message'] ?? 'Error communicating with Gemini API',
        'details' => $data
    ]);
}
