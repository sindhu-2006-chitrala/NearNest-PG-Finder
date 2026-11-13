
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.Base64;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;

public class Main {

    static String url = "jdbc:mysql://localhost:3306/nearnest";
    static String username = "root";
    static String password = "Sindhu@2006";

    public static void main(String[] args) {

        try {
            HttpServer server = HttpServer.create(
                new InetSocketAddress(8080), 0
            );

            // Backend test
            server.createContext("/test", exchange -> {
                addCorsHeaders(exchange);

                if (exchange.getRequestMethod().equals("OPTIONS")) {
                    exchange.sendResponseHeaders(204, -1);
                    exchange.close();
                    return;
                }

                sendResponse(exchange, 200,
                    "NearNest backend is working!",
                    "text/plain; charset=UTF-8");
            });

            // Owner registration
            server.createContext("/register-owner", exchange -> {
                addCorsHeaders(exchange);

                if (exchange.getRequestMethod().equals("OPTIONS")) {
                    exchange.sendResponseHeaders(204, -1);
                    exchange.close();
                    return;
                }

                if (!exchange.getRequestMethod().equals("POST")) {
                    sendResponse(exchange, 405,
                        "{\"success\":false,\"message\":\"POST method required\"}",
                        "application/json; charset=UTF-8");
                    return;
                }

                try {
                    String requestData = new String(
                        exchange.getRequestBody().readAllBytes(),
                        StandardCharsets.UTF_8
                    );

                    Map<String, String> formData =
                        parseFormData(requestData);

                    String ownerName = formData.get("ownerName");
                    String mobile = formData.get("mobile");

                    if (ownerName == null || ownerName.isBlank()
                            || mobile == null || mobile.isBlank()) {
                        sendResponse(exchange, 400,
                            "{\"success\":false,\"message\":\"Name and mobile are required\"}",
                            "application/json; charset=UTF-8");
                        return;
                    }

                    String sql =
                        "INSERT INTO owners (owner_name, mobile) VALUES (?, ?)";

                    try (
                        Connection connection =
                            DriverManager.getConnection(url, username, password);
                        PreparedStatement statement =
                            connection.prepareStatement(
                                sql, Statement.RETURN_GENERATED_KEYS
                            )
                    ) {
                        statement.setString(1, ownerName);
                        statement.setString(2, mobile);
                        statement.executeUpdate();

                        try (ResultSet result = statement.getGeneratedKeys()) {
                            if (result.next()) {
                                int ownerId = result.getInt(1);

                                sendResponse(exchange, 201,
                                    "{\"success\":true,\"ownerId\":" + ownerId + "}",
                                    "application/json; charset=UTF-8");
                            } else {
                                sendResponse(exchange, 500,
                                    "{\"success\":false,\"message\":\"Owner ID was not generated\"}",
                                    "application/json; charset=UTF-8");
                            }
                        }
                    }

                } catch (Exception e) {
                    e.printStackTrace();
                    sendResponse(exchange, 500,
                        "{\"success\":false,\"message\":\"Owner registration failed\"}",
                        "application/json; charset=UTF-8");
                }
            });

            // Add PG details and photos
            server.createContext("/add-pg", exchange -> {
                addCorsHeaders(exchange);

                if (exchange.getRequestMethod().equals("OPTIONS")) {
                    exchange.sendResponseHeaders(204, -1);
                    exchange.close();
                    return;
                }

                if (!exchange.getRequestMethod().equals("POST")) {
                    sendResponse(exchange, 405,
                        "{\"success\":false,\"message\":\"POST method required\"}",
                        "application/json; charset=UTF-8");
                    return;
                }

                try {
                    String requestData = new String(
                        exchange.getRequestBody().readAllBytes(),
                        StandardCharsets.UTF_8
                    );

                    Map<String, String> formData =
                        parseFormData(requestData);

                    int ownerId = Integer.parseInt(formData.get("ownerId"));
                    String pgName = formData.get("pgName");
                    String city = formData.get("city");
                    String area = formData.get("area");
                    String address = formData.get("address");
                    double rent = Double.parseDouble(formData.get("rent"));
                    String roomType = formData.get("roomType");
                    int beds = Integer.parseInt(formData.get("beds"));
                    String facilities = formData.get("facilities");
                    String contact = formData.get("contact");

                    int photoCount = Integer.parseInt(
                        formData.getOrDefault("photoCount", "0")
                    );

                    if (ownerId <= 0
                            || pgName == null || pgName.isBlank()
                            || city == null || city.isBlank()
                            || area == null || area.isBlank()
                            || rent <= 0
                            || roomType == null || roomType.isBlank()
                            || beds <= 0
                            || facilities == null || facilities.isBlank()
                            || contact == null || contact.isBlank()
                            || photoCount < 0 || photoCount > 20) {

                        sendResponse(exchange, 400,
                            "{\"success\":false,\"message\":\"Invalid or missing PG details\"}",
                            "application/json; charset=UTF-8");
                        return;
                    }

                    String pgSql =
                        "INSERT INTO pg_details " +
                        "(owner_id, pg_name, city, area, address, rent, " +
                        "room_type, beds, facilities, contact) " +
                        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

                    String photoSql =
                        "INSERT INTO pg_photos (pg_id, photo_name, photo_data) " +
                        "VALUES (?, ?, ?)";

                    try (Connection connection =
                             DriverManager.getConnection(url, username, password)) {

                        connection.setAutoCommit(false);

                        try {
                            int pgId;

                            try (PreparedStatement statement =
                                     connection.prepareStatement(
                                         pgSql, Statement.RETURN_GENERATED_KEYS
                                     )) {

                                statement.setInt(1, ownerId);
                                statement.setString(2, pgName);
                                statement.setString(3, city);
                                statement.setString(4, area);
                                statement.setString(5, address);
                                statement.setDouble(6, rent);
                                statement.setString(7, roomType);
                                statement.setInt(8, beds);
                                statement.setString(9, facilities);
                                statement.setString(10, contact);

                                statement.executeUpdate();

                                try (ResultSet result = statement.getGeneratedKeys()) {
                                    if (!result.next()) {
                                        throw new Exception("PG ID was not generated");
                                    }

                                    pgId = result.getInt(1);
                                }
                            }

                            try (PreparedStatement photoStatement =
                                     connection.prepareStatement(photoSql)) {

                                for (int i = 0; i < photoCount; i++) {
                                    String photo = formData.get("photo" + i);

                                    if (photo == null || photo.isBlank()) {
                                        throw new Exception(
                                            "Photo " + (i + 1) + " is missing"
                                        );
                                    }

                                    String photoName = formData.getOrDefault(
                                        "photoName" + i, "pg-photo-" + (i + 1)
                                    );

                                    int commaIndex = photo.indexOf(",");

                                    if (photo.startsWith("data:") && commaIndex >= 0) {
                                        photo = photo.substring(commaIndex + 1);
                                    }

                                    byte[] imageBytes =
                                        Base64.getDecoder().decode(photo);

                                    photoStatement.setInt(1, pgId);
                                    photoStatement.setString(2, photoName);
                                    photoStatement.setBytes(3, imageBytes);
                                    photoStatement.executeUpdate();
                                }
                            }

                            connection.commit();

                            sendResponse(exchange, 201,
                                "{\"success\":true,\"pgId\":" + pgId +
                                ",\"photoCount\":" + photoCount + "}",
                                "application/json; charset=UTF-8");

                        } catch (Exception e) {
                            connection.rollback();
                            throw e;
                        }
                    }

                } catch (NumberFormatException e) {
                    sendResponse(exchange, 400,
                        "{\"success\":false,\"message\":\"Invalid numeric value\"}",
                        "application/json; charset=UTF-8");

                } catch (Exception e) {
                    e.printStackTrace();
                    sendResponse(exchange, 500,
                        "{\"success\":false,\"message\":\"Unable to save PG details and photos\"}",
                        "application/json; charset=UTF-8");
                }
            });

            // Seeker registration
            server.createContext("/register-seeker", exchange -> {
                addCorsHeaders(exchange);

                if (exchange.getRequestMethod().equals("OPTIONS")) {
                    exchange.sendResponseHeaders(204, -1);
                    exchange.close();
                    return;
                }

                if (!exchange.getRequestMethod().equals("POST")) {
                    sendResponse(exchange, 405,
                        "{\"success\":false,\"message\":\"POST method required\"}",
                        "application/json; charset=UTF-8");
                    return;
                }

                try {
                    String requestData = new String(
                        exchange.getRequestBody().readAllBytes(),
                        StandardCharsets.UTF_8
                    );

                    Map<String, String> formData =
                        parseFormData(requestData);

                    String fullName = formData.get("fullName");
                    String mobile = formData.get("mobile");
                    String purpose = formData.get("purpose");
                    String city = formData.get("city");
                    String area = formData.get("area");
                    String budget = formData.get("budget");
                    String roomType = formData.get("roomType");

                    if (fullName == null || fullName.isBlank()
                            || mobile == null || mobile.isBlank()
                            || city == null || city.isBlank()) {

                        sendResponse(exchange, 400,
                            "{\"success\":false,\"message\":\"Name, mobile and city are required\"}",
                            "application/json; charset=UTF-8");
                        return;
                    }

                    String sql =
                        "INSERT INTO seekers " +
                        "(full_name, mobile, purpose, city, area, budget, room_type) " +
                        "VALUES (?, ?, ?, ?, ?, ?, ?)";

                    try (
                        Connection connection =
                            DriverManager.getConnection(url, username, password);

                        PreparedStatement statement =
                            connection.prepareStatement(
                                sql, Statement.RETURN_GENERATED_KEYS
                            )
                    ) {
                        statement.setString(1, fullName);
                        statement.setString(2, mobile);
                        statement.setString(3, purpose);
                        statement.setString(4, city);
                        statement.setString(5, area);
                        statement.setString(6, budget);
                        statement.setString(7, roomType);

                        statement.executeUpdate();

                        try (ResultSet result = statement.getGeneratedKeys()) {
                            if (result.next()) {
                                int seekerId = result.getInt(1);

                                sendResponse(exchange, 201,
                                    "{\"success\":true,\"seekerId\":" + seekerId + "}",
                                    "application/json; charset=UTF-8");
                            } else {
                                sendResponse(exchange, 500,
                                    "{\"success\":false,\"message\":\"Seeker ID was not generated\"}",
                                    "application/json; charset=UTF-8");
                            }
                        }
                    }

                } catch (Exception e) {
                    e.printStackTrace();

                    sendResponse(exchange, 500,
                        "{\"success\":false,\"message\":\"Seeker registration failed\"}",
                        "application/json; charset=UTF-8");
                }
            });

            // Get PG listings and photos from MySQL
            server.createContext("/get-pgs", exchange -> {
                addCorsHeaders(exchange);

                if (exchange.getRequestMethod().equals("OPTIONS")) {
                    exchange.sendResponseHeaders(204, -1);
                    exchange.close();
                    return;
                }

                if (!exchange.getRequestMethod().equals("GET")) {
                    sendResponse(exchange, 405,
                        "{\"success\":false,\"message\":\"GET method required\"}",
                        "application/json; charset=UTF-8");
                    return;
                }

                try {
                    Map<Integer, Map<String, Object>> pgMap =
                        new LinkedHashMap<>();

                    String pgSql =
                        "SELECT pg_id, pg_name, city, area, address, rent, " +
                        "room_type, beds, facilities, contact " +
                        "FROM pg_details ORDER BY pg_id DESC";

                    try (Connection connection =
                             DriverManager.getConnection(url, username, password);
                         PreparedStatement statement =
                             connection.prepareStatement(pgSql);
                         ResultSet result = statement.executeQuery()) {

                        while (result.next()) {
                            int pgId = result.getInt("pg_id");

                            Map<String, Object> pg = new LinkedHashMap<>();

                            pg.put("pgId", pgId);
                            pg.put("name", result.getString("pg_name"));
                            pg.put("city", result.getString("city"));
                            pg.put("area", result.getString("area"));
                            pg.put("address", result.getString("address"));
                            pg.put("rent", result.getDouble("rent"));
                            pg.put("roomType", result.getString("room_type"));
                            pg.put("beds", result.getInt("beds"));
                            pg.put("facilities", result.getString("facilities"));
                            pg.put("contact", result.getString("contact"));

                            pg.put("images", new java.util.ArrayList<String>());

                            pgMap.put(pgId, pg);
                        }

                        // Retrieve photos for each PG
                        String photoSql =
                            "SELECT photo_name, photo_data " +
                            "FROM pg_photos WHERE pg_id = ? ORDER BY photo_id";

                        try (PreparedStatement photoStatement =
                                 connection.prepareStatement(photoSql)) {

                            for (Map.Entry<Integer, Map<String, Object>> entry
                                    : pgMap.entrySet()) {

                                int pgId = entry.getKey();

                                photoStatement.setInt(1, pgId);

                                try (ResultSet photoResult =
                                         photoStatement.executeQuery()) {

                                    @SuppressWarnings("unchecked")
                                    java.util.List<String> images =
                                        (java.util.List<String>)
                                        entry.getValue().get("images");

                                    while (photoResult.next()) {
                                        String photoName =
                                            photoResult.getString("photo_name");

                                        byte[] photoBytes =
                                            photoResult.getBytes("photo_data");

                                        if (photoBytes != null) {
                                            String contentType =
                                                getImageContentType(photoName);

                                            String base64 =
                                                Base64.getEncoder()
                                                    .encodeToString(photoBytes);

                                            images.add(
                                                "data:" + contentType +
                                                ";base64," + base64
                                            );
                                        }
                                    }
                                }
                            }
                        }
                    }

                    StringBuilder json = new StringBuilder();

                    json.append("{\"success\":true,\"pgs\":[");

                    boolean firstPG = true;

                    for (Map<String, Object> pg : pgMap.values()) {

                        if (!firstPG) {
                            json.append(",");
                        }

                        firstPG = false;

                        json.append("{");

                        json.append("\"pgId\":")
                            .append(pg.get("pgId")).append(",");

                        json.append("\"name\":\"")
                            .append(jsonEscape(pg.get("name"))).append("\",");

                        json.append("\"city\":\"")
                            .append(jsonEscape(pg.get("city"))).append("\",");

                        json.append("\"area\":\"")
                            .append(jsonEscape(pg.get("area"))).append("\",");

                        json.append("\"address\":\"")
                            .append(jsonEscape(pg.get("address"))).append("\",");

                        json.append("\"rent\":")
                            .append(pg.get("rent")).append(",");

                        json.append("\"roomType\":\"")
                            .append(jsonEscape(pg.get("roomType"))).append("\",");

                        json.append("\"beds\":")
                            .append(pg.get("beds")).append(",");

                        json.append("\"facilities\":\"")
                            .append(jsonEscape(pg.get("facilities"))).append("\",");

                        json.append("\"contact\":\"")
                            .append(jsonEscape(pg.get("contact"))).append("\",");

                        json.append("\"images\":[");

                        @SuppressWarnings("unchecked")
                        java.util.List<String> images =
                            (java.util.List<String>) pg.get("images");

                        for (int i = 0; i < images.size(); i++) {
                            if (i > 0) {
                                json.append(",");
                            }

                            json.append("\"")
                                .append(jsonEscape(images.get(i)))
                                .append("\"");
                        }

                        json.append("]}");
                    }

                    json.append("]}");

                    sendResponse(exchange, 200,
                        json.toString(),
                        "application/json; charset=UTF-8");

                } catch (Exception e) {
                    e.printStackTrace();

                    sendResponse(exchange, 500,
                        "{\"success\":false,\"message\":\"Unable to retrieve PG listings\"}",
                        "application/json; charset=UTF-8");
                }
            });

            server.start();

            System.out.println(
                "NearNest backend server started at http://localhost:8080"
            );

        } catch (IOException e) {
            System.out.println("Server could not start.");
            e.printStackTrace();
        }
    }

    // Identify image format
    private static String getImageContentType(String photoName) {

        if (photoName == null) {
            return "image/jpeg";
        }

        String name = photoName.toLowerCase();

        if (name.endsWith(".png")) {
            return "image/png";
        }

        if (name.endsWith(".webp")) {
            return "image/webp";
        }

        if (name.endsWith(".gif")) {
            return "image/gif";
        }

        return "image/jpeg";
    }

    // Escape special characters for JSON
    private static String jsonEscape(Object value) {

        if (value == null) {
            return "";
        }

        String text = value.toString();

        return text
            .replace("\\", "\\\\")
            .replace("\"", "\\\"")
            .replace("\n", "\\n")
            .replace("\r", "\\r")
            .replace("\t", "\\t");
    }

    // CORS headers
    private static void addCorsHeaders(HttpExchange exchange) {

        exchange.getResponseHeaders().set(
            "Access-Control-Allow-Origin", "http://127.0.0.1:5501"
        );

        exchange.getResponseHeaders().set(
            "Access-Control-Allow-Methods", "GET, POST, OPTIONS"
        );

        exchange.getResponseHeaders().set(
            "Access-Control-Allow-Headers", "Content-Type"
        );
    }

    // Parse URL-encoded form data
    private static Map<String, String> parseFormData(String data) {

        Map<String, String> formData = new HashMap<>();

        for (String pair : data.split("&")) {

            String[] parts = pair.split("=", 2);

            String key = URLDecoder.decode(
                parts[0], StandardCharsets.UTF_8
            );

            String value = "";

            if (parts.length > 1) {
                value = URLDecoder.decode(
                    parts[1], StandardCharsets.UTF_8
                );
            }

            formData.put(key, value);
        }

        return formData;
    }

    // Send response
    private static void sendResponse(
        HttpExchange exchange,
        int statusCode,
        String response,
        String contentType
    ) throws IOException {

        byte[] responseBytes =
            response.getBytes(StandardCharsets.UTF_8);

        exchange.getResponseHeaders().set(
            "Content-Type", contentType
        );

        exchange.sendResponseHeaders(
            statusCode, responseBytes.length
        );

        try (OutputStream output = exchange.getResponseBody()) {
            output.write(responseBytes);
        }
    }
}
