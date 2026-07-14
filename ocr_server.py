import os
import json
import tempfile
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from google import genai
from paddleocr import PaddleOCR

# Khởi tạo Flask với static_folder trỏ tới thư mục hiện tại để serve các file giao diện
app = Flask(__name__, static_folder=".", static_url_path="")
CORS(app)  # Cho phép gọi API từ Frontend (trình duyệt) chạy ở origin khác

# Khởi tạo PaddleOCR lazily để server start nhanh hơn
ocr_model = None

def get_ocr_model():
    global ocr_model
    if ocr_model is None:
        print("Đang tải model PaddleOCR (lang='vi')... Lần đầu chạy có thể mất vài phút.")
        ocr_model = PaddleOCR(use_angle_cls=True, lang="vi")
    return ocr_model

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
        # Lưu file tạm thời để PaddleOCR đọc
        with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as temp_file:
            temp_path = temp_file.name
            file.save(temp_path)

        print(f"Đang xử lý file tạm: {temp_path}")

        # Chạy OCR
        ocr = get_ocr_model()
        result = ocr.ocr(temp_path, cls=True)

        # Xóa file tạm ngay sau khi quét xong
        if os.path.exists(temp_path):
            os.remove(temp_path)

        # Gom tất cả các đoạn text
        raw_texts = []
        for idx in range(len(result)):
            res = result[idx]
            if res:
                for line in res:
                    raw_texts.append(line[1][0])

        ocr_merged_text = "\n".join(raw_texts)
        print("--- Văn bản trích xuất thô ---")
        print(ocr_merged_text)
        print("-------------------------------")

        if not ocr_merged_text.strip():
            return jsonify({"error": "Không thể trích xuất văn bản từ hình ảnh này. Hãy thử ảnh rõ nét hơn."}), 422

        # Cấu trúc hóa với Gemini
        system_instruction = """
        Bạn là một trợ lý AI chuyên cấu trúc hóa văn bản thô từ OCR của CCCD Việt Nam.
        Trả về CHỈ một chuỗi JSON sạch (không bọc trong dấu ```json) có các key: 
        "ho_va_ten", "ngay_sinh", "so_cccd", "dia_chi", "gioi_tinh", "que_quan".
        """
        user_prompt = f"Hãy trích xuất thông tin từ đoạn văn bản OCR sau:\n\n{ocr_merged_text}"

        response = client.models.generate_content(
            model="gemini-1.5-flash",
            contents=user_prompt,
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
        "paddleocr_loaded": ocr_model is not None
    })


@app.route("/")
def serve_index():
    return send_from_directory(".", "index.html")


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"Đang chạy OCR Server tại: http://localhost:{port}")
    app.run(host="0.0.0.0", port=port, debug=False)
