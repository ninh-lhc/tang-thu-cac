import re
import os

def split_novel_by_chapter(input_file, max_words=450000):
    # Đọc nội dung file truyện gốc
    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()

    # Dùng Regex để tách truyện thành danh sách các chương
    # Giả sử tiêu đề chương bắt đầu bằng "Chương " hoặc "Hồi " ở đầu dòng
    # Bạn có thể sửa từ khóa này cho khớp với file text của bạn
    chapters = re.split(r'(?=\n(?:Chương|Hồi)\s+\d+)', content)

    current_word_count = 0
    current_chunk = []
    file_index = 1
    
    # Tạo thư mục để chứa các file đã cắt (nếu chưa có)
    os.makedirs('truyen_da_cat', exist_ok=True)

    print(f"Bắt đầu cắt truyện. Tổng số chương tìm thấy: {len(chapters)}")

    for chapter in chapters:
        # Đếm số từ trong chương hiện tại
        words_in_chapter = len(chapter.split())
        
        # Nếu thêm chương này vào mà vượt quá giới hạn từ
        if current_word_count + words_in_chapter > max_words:
            # Lưu cụm chương hiện tại thành 1 file mới
            output_name = f'truyen_da_cat/phan_{file_index}.txt'
            with open(output_name, 'w', encoding='utf-8') as out_file:
                out_file.write("".join(current_chunk))
            
            print(f"Đã tạo {output_name} - Số từ: {current_word_count}")
            
            # Reset lại biến đếm để bắt đầu cụm file tiếp theo
            file_index += 1
            current_chunk = [chapter]
            current_word_count = words_in_chapter
        else:
            # Nếu chưa vượt giới hạn, tiếp tục cộng dồn chương vào cụm hiện tại
            current_chunk.append(chapter)
            current_word_count += words_in_chapter

    # Lưu cụm chương cuối cùng (phần còn sót lại)
    if current_chunk:
        output_name = f'truyen_da_cat/phan_{file_index}.txt'
        with open(output_name, 'w', encoding='utf-8') as out_file:
            out_file.write("".join(current_chunk))
        print(f"Đã tạo {output_name} - Số từ: {current_word_count}")

    print("Hoàn tất việc cắt truyện!")

# Chạy hàm với file TXT của bạn
# Đặt giới hạn 450.000 từ để an toàn dưới mức 500.000 của NotebookLM
split_novel_by_chapter('truyen_full.txt', max_words=450000)