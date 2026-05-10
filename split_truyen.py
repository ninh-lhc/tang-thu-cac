import re
from pathlib import Path


MAX_WORDS = 450000
OUTPUT_PATTERN = re.compile(r"^phan_\d+\.txt$", re.IGNORECASE)


def find_input_file(folder):
    text_files = [
        file
        for file in folder.glob("*.txt")
        if not OUTPUT_PATTERN.match(file.name)
    ]

    if not text_files:
        raise FileNotFoundError("Không tìm thấy file .txt nào cùng thư mục với split_truyen.py.")

    if len(text_files) > 1:
        file_names = ", ".join(file.name for file in text_files)
        raise RuntimeError(
            "Chỉ nên để 1 file .txt gốc cùng thư mục với split_truyen.py. "
            f"Đang thấy: {file_names}"
        )

    return text_files[0]


def split_novel_by_chapter(input_file, max_words=MAX_WORDS):
    input_file = Path(input_file)
    output_folder = input_file.parent

    with input_file.open("r", encoding="utf-8") as f:
        content = f.read()

    chapters = re.split(r"(?=\n(?:Chương|Hồi)\s+\d+)", content)

    current_word_count = 0
    current_chunk = []
    file_index = 1

    print(f"Đang đọc file: {input_file.name}")
    print(f"Bắt đầu cắt truyện. Tổng số phần/chương tìm thấy: {len(chapters)}")

    for chapter in chapters:
        # Đếm số từ trong chương hiện tại
        words_in_chapter = len(chapter.split())
        
        # Nếu thêm chương này vào mà vượt quá giới hạn từ
        if current_chunk and current_word_count + words_in_chapter > max_words:
            output_name = output_folder / f"phan_{file_index:02d}.txt"
            with output_name.open("w", encoding="utf-8") as out_file:
                out_file.write("".join(current_chunk))
            
            print(f"Đã tạo {output_name.name} - Số từ: {current_word_count}")
            
            file_index += 1
            current_chunk = [chapter]
            current_word_count = words_in_chapter
        else:
            current_chunk.append(chapter)
            current_word_count += words_in_chapter

    if current_chunk:
        output_name = output_folder / f"phan_{file_index:02d}.txt"
        with output_name.open("w", encoding="utf-8") as out_file:
            out_file.write("".join(current_chunk))
        print(f"Đã tạo {output_name.name} - Số từ: {current_word_count}")

    print("Hoàn tất việc cắt truyện!")


if __name__ == "__main__":
    script_folder = Path(__file__).resolve().parent
    input_file = find_input_file(script_folder)
    split_novel_by_chapter(input_file)