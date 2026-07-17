import os
import json
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from google import genai
from google.genai import types

# Khởi tạo Flask với static_folder trỏ tới thư mục hiện tại để serve các file giao diện
app = Flask(__name__, static_folder=".", static_url_path="")
CORS(app)  # Cho phép gọi API từ Frontend (trình duyệt) chạy ở origin khác

# Khởi tạo Gemini Client từ biến môi trường GEMINI_API_KEY
# (Hãy đảm bảo đã set biến môi trường này trước khi chạy server)
try:
    client = genai.Client()
except Exception as e:
    print(f"Cảnh báo: Không thể khởi tạo Gemini Client. Hãy kiểm tra biến môi trường GEMINI_API_KEY. Chi tiết: {e}")
    client = None


@app.route("/api/scan", methods=["POST"])
def scan_cccd():
    if "file" not in request.files:
        return jsonify({"error": "Không tìm thấy file ảnh tải lên trong request."}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "Tên file rỗng."}), 400

    if not client:
        return jsonify({
            "error": "Gemini Client chưa được cấu hình. Vui lòng đặt biến môi trường GEMINI_API_KEY và khởi động lại server."
        }), 500

    try:
        # Đọc dữ liệu file ảnh dưới dạng bytes
        image_bytes = file.read()
        mime_type = file.content_type or "image/jpeg"

        # Cấu trúc hóa trực tiếp với Gemini sử dụng Multimodal
        system_instruction = """
        Bạn là một trợ lý AI chuyên cấu trúc hóa thông tin từ ảnh chụp CCCD (Căn cước công dân) Việt Nam.
        Đọc và trích xuất các thông tin từ ảnh mặt trước CCCD được cung cấp.
        Trả về CHỈ một chuỗi JSON sạch (không bọc trong dấu ```json) có các key: 
        "ho_va_ten", "ngay_sinh", "so_cccd", "dia_chi", "gioi_tinh", "que_quan".
        Nếu có trường nào không đọc được, hãy trả về giá trị rỗng "".
        """
        user_prompt = "Hãy phân tích hình ảnh CCCD này và trích xuất thông tin chính xác tuyệt đối bằng tiếng Việt có dấu."

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[
                types.Part.from_bytes(
                    data=image_bytes,
                    mime_type=mime_type,
                ),
                user_prompt
            ],
            config={
                "system_instruction": system_instruction,
                "response_mime_type": "application/json",
            },
        )

        # Parse kết quả JSON và trả về
        data_json = json.loads(response.text)
        return jsonify(data_json)

    except Exception as e:
        print(f"Lỗi hệ thống: {e}")
        return jsonify({"error": f"Lỗi trong quá trình xử lý: {str(e)}"}), 500


@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({
        "status": "healthy",
        "gemini_configured": client is not None,
        "gemini_multimodal": True
    })



@app.route("/")
def serve_index():
    return send_from_directory(".", "index.html")


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"Đang chạy OCR Server tại: http://localhost:{port}")
    app.run(host="0.0.0.0", port=port, debug=False)
