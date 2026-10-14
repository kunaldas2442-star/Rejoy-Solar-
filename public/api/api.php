<?php
/**
 * SolarPulse EPC ERP & CRM - Production PHP MySQL API Endpoint
 * For Hostinger / cPanel / Apache Shared Hosting Deployments
 */
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');
header('X-XSS-Protection: 1; mode=block');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-User-Id, X-User-Role');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

function verifyUserPassword($password, $storedHash) {
    if (!$password || !$storedHash) return false;
    if (password_verify($password, $storedHash)) return true;
    if (hash_equals((string)$storedHash, (string)$password)) return true;
    return false;
}

$dbHost = getenv('DB_HOST') ?: 'localhost';
$dbName = getenv('DB_NAME') ?: '';
$dbUser = getenv('DB_USER') ?: '';
$dbPass = getenv('DB_PASS') ?: '';

// Search in .env files if not set in environment
if (!$dbName) {
    $searchPaths = [
        __DIR__ . '/../../.env',
        __DIR__ . '/../.env',
        dirname(__DIR__, 2) . '/.env'
    ];
    foreach ($searchPaths as $path) {
        if (file_exists($path)) {
            $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ($lines as $line) {
                if (preg_match('/^\s*DB_HOST\s*=\s*(.+)$/', $line, $m)) $dbHost = trim($m[1], "\"' \r\n");
                if (preg_match('/^\s*DB_NAME\s*=\s*(.+)$/', $line, $m)) $dbName = trim($m[1], "\"' \r\n");
                if (preg_match('/^\s*DB_USER\s*=\s*(.+)$/', $line, $m)) $dbUser = trim($m[1], "\"' \r\n");
                if (preg_match('/^\s*DB_PASS\s*=\s*(.+)$/', $line, $m)) $dbPass = trim($m[1], "\"' \r\n");
            }
            if ($dbName) break;
        }
    }
}

$pdo = null;
if ($dbName) {
    try {
        $pdo = new PDO("mysql:host={$dbHost};dbname={$dbName};charset=utf8mb4", $dbUser, $dbPass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_TIMEOUT => 5
        ]);
    } catch (PDOException $e) {
        // Fallback or error
    }
}

$method = $_SERVER['REQUEST_METHOD'];
$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$body = json_decode(file_get_contents('php://input'), true) ?: [];

// Status / DB check
if (strpos($requestUri, 'db/status') !== false || strpos($requestUri, 'db.php') !== false) {
    echo json_encode([
        'success' => true,
        'connected' => ($pdo !== null),
        'database' => $dbName,
        'host' => $dbHost,
        'message' => $pdo ? 'MySQL connected successfully.' : 'Operating in fallback mode. Configure DB in .env'
    ]);
    exit;
}

// Download SQL Dump
if (strpos($requestUri, 'dump.sql') !== false || strpos($requestUri, 'export-sql') !== false) {
    $dumpFile = __DIR__ . '/solar_mysql_dump.sql';
    if (!file_exists($dumpFile)) $dumpFile = __DIR__ . '/schema.sql';
    if (file_exists($dumpFile)) {
        header('Content-Type: application/sql');
        header('Content-Disposition: attachment; filename="solarpulse_production_mysql.sql"');
        readfile($dumpFile);
        exit;
    }
}

// Auth Login
if (strpos($requestUri, 'auth/login') !== false) {
    $email = strtolower(trim($body['email'] ?? ''));
    $pass = trim($body['password'] ?? '');

    if ($pdo) {
        $stmt = $pdo->prepare("SELECT * FROM solar_users WHERE LOWER(email) = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();
        if ($user && verifyUserPassword($pass, $user['password'])) {
            echo json_encode([
                'success' => true,
                'user' => [
                    'id' => $user['id'],
                    'name' => $user['name'],
                    'email' => $user['email'],
                    'role' => $user['role'],
                    'department' => $user['department'],
                    'designation' => $user['designation']
                ],
                'token' => 'php_' . bin2hex(random_bytes(16))
            ]);
            exit;
        }

        // Check customers
        $stmt = $pdo->prepare("SELECT * FROM solar_customers WHERE LOWER(email) = ?");
        $stmt->execute([$email]);
        $cust = $stmt->fetch();
        if ($cust && verifyUserPassword($pass, $cust['password'])) {
            echo json_encode([
                'success' => true,
                'user' => [
                    'id' => 'usr-' . $cust['id'],
                    'customerId' => $cust['id'],
                    'name' => $cust['name'],
                    'email' => $cust['email'],
                    'role' => 'Customer',
                    'department' => 'Customer'
                ],
                'token' => 'cust_' . bin2hex(random_bytes(16))
            ]);
            exit;
        }
    }

    echo json_encode([
        'success' => false,
        'message' => 'Invalid email or password'
    ]);
    exit;
}

// Default response
echo json_encode([
    'success' => true,
    'message' => 'SolarPulse PHP API is operational',
    'mysql_ready' => ($pdo !== null)
]);
