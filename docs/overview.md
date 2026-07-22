# Kế hoạch kỹ thuật — Web Video Editor (ffmpeg.wasm)

Giả định: React + Vite, ffmpeg.wasm single-thread (`@ffmpeg/ffmpeg` + `@ffmpeg/core`, không multi-thread), chạy hoàn toàn client-side, không backend. Mỗi phase là một trạng thái chạy được, test được độc lập.

---

## Phase 0 — Base project + xác nhận pipeline chạy được ✅

**Trạng thái:** Hoàn thành.

**Ghi chú thực tế:**
- Bootstrap mới bằng Vite + React + TypeScript (không clone repo cũ).
- Dùng `@ffmpeg/ffmpeg` 0.12.x + `@ffmpeg/core` 0.12.6 single-thread.
- `@ffmpeg/core-mt` (multi-thread) bị broken: encoding treo, không dùng được.
- UI: shadcn (base-nova) + Tailwind v4.
- COOP/COEP headers cần set trong vite config cho SharedArrayBuffer.

---

## Phase 1 — Multi-clip + Normalize + Concat ✅

**Trạng thái:** Hoàn thành.

**Ghi chú thực tế:**
- Single clip: `-c copy` instant.
- Multi clip: normalize từng clip về 720x1280 (`libx264 -preset ultrafast -crf 28`) → concat bằng demuxer (`-f concat -c copy`).
- `-movflags +faststart` cần thiết để browser play preview được (moov atom ở đầu).
- Clip không audio → fallback thêm silent track (`anullsrc`).
- `filter_complex concat` không dùng được (cùng codec nhưng khác resolution → lỗi). Phải normalize trước rồi concat demuxer.
- Video encoding trong wasm rất chậm (~1 phút cho 10s clip ở 720p). Chấp nhận được cho MVP.

---

## Phase 2 — UI sắp xếp thứ tự + Trim từng clip

**Mục tiêu:** User tự kéo-thả đổi thứ tự clip, tự chỉnh điểm cắt (start/end) cho từng clip trước khi export.

**Việc làm:**

1. Thêm `dnd-kit` (nhẹ hơn `react-beautiful-dnd`, activity còn duy trì) cho phần kéo-thả reorder list clip.
2. Với mỗi clip: hiển thị `<video>` preview + input số (hoặc range slider) cho `startTime`/`endTime`. Preview trim **không dùng ffmpeg** — chỉ set `video.currentTime` và giới hạn playback trong khoảng đó bằng JS, để tránh chạy ffmpeg liên tục lúc user còn đang chỉnh tay.
3. Khi export: thêm `-ss {start} -to {end}` vào lệnh normalize của từng clip (gộp trim + normalize thành 1 lệnh ffmpeg/clip thay vì 2 lệnh riêng, giảm số lần ghi/đọc virtual FS).
4. State clip lúc này: `{id, file, name, order, startTime, endTime}`.

**Acceptance criteria:** Kéo đổi thứ tự 3 clip, chỉnh trim mỗi clip, export ra đúng thứ tự và đúng đoạn đã chọn.

**Rủi ro:** `-ss` đặt trước `-i` (input seeking, nhanh nhưng kém chính xác ở keyframe) vs đặt sau `-i` (output seeking, chính xác hơn nhưng chậm vì phải decode từ đầu). Với clip ngắn (Shorts, vài giây tới 1 phút), nên dùng output seeking (đặt `-ss` sau `-i`) để ưu tiên chính xác, vì chênh lệch tốc độ không đáng kể ở độ dài này.

---

## Phase 3 — Text Overlay (Title + Rank number)

**Mục tiêu:** Thêm title text và số thứ hạng lên video, tái hiện đúng tính năng cốt lõi của Viblo ban đầu.

**Việc làm:**

1. UI form: input title text, chọn font size, màu chữ, màu nền/stroke (không cần WYSIWYG canvas kéo-thả ở bản đầu — form input là đủ, thêm canvas preview sau nếu cần).
2. Cần bundle 1 file font `.ttf` vào project (drawtext filter cần path tới font file, ghi font vào virtual FS của ffmpeg.wasm trước khi dùng) — vì font hệ thống không dùng được trong WASM sandbox.
3. Filter `drawtext` áp lên từng clip hoặc lên output cuối cùng tùy title là cố định toàn video hay đổi theo từng clip (theo mô tả Viblo gốc — mỗi rank có số thứ tự riêng, nên áp `drawtext` cho rank-number theo từng clip trước khi concat, còn title chính áp lên toàn bộ output sau concat):
   ```
   -vf "drawtext=fontfile=/font.ttf:text='Rank 1':fontsize=48:fontcolor=white:borderw=3:bordercolor=black:x=(w-text_w)/2:y=50"
   ```
4. Tích hợp bước này vào lệnh normalize sẵn có ở Phase 1 (gộp scale+pad+drawtext trong 1 lệnh `-vf` chain, tránh chạy ffmpeg nhiều lần trên cùng 1 file).

**Acceptance criteria:** Video xuất ra có rank number trên từng clip và title chính hiển thị xuyên suốt hoặc ở đoạn đầu tùy thiết kế.

**Rủi ro:** Text tiếng Việt có dấu — cần chọn font hỗ trợ Unicode tiếng Việt đầy đủ (không phải font nào cũng có dấu), và cần encode UTF-8 đúng khi truyền string vào `drawtext` (ffmpeg filter string dễ vỡ với ký tự đặc biệt như dấu `:` hoặc `'` trong text — cần escape).

---

## Phase 4 — Audio nền (nhạc) + Mix

**Mục tiêu:** Cho phép upload 1 file nhạc nền, mix với audio gốc của clip (hoặc thay thế hoàn toàn nếu clip không cần giữ tiếng gốc).

**Việc làm:**

1. UI: upload file mp3/wav, slider chỉnh volume nhạc nền, toggle "giữ tiếng gốc clip hay không".
2. Filter `amix` nếu giữ cả 2 nguồn audio:
   ```
   -filter_complex "[0:a][1:a]amix=inputs=2:duration=first:weights=1 0.3[aout]"
   ```
   (`weights` để nhạc nền nhỏ hơn audio gốc, tránh lấn tiếng)
3. Nếu nhạc nền ngắn hơn video: loop bằng `-stream_loop -1` trên input nhạc trước khi mix, rồi `-t {video_duration}` để cắt đúng độ dài.
4. Nếu nhạc nền dài hơn video: `amix` với `duration=first` tự cắt theo track đầu tiên (audio gốc/video), không cần xử lý thêm.

**Acceptance criteria:** Export ra video có nhạc nền mix đúng volume, không bị cắt cụt hoặc lặp sai.

---

## Phase 5 — Polish + Robustness

**Mục tiêu:** Xử lý các edge case thực tế sẽ gặp khi dùng hàng ngày, không phải tính năng mới.

**Việc làm:**

1. Progress bar thật (ffmpeg.wasm có event `progress`, hiển thị % thay vì spinner vô định — quan trọng vì export video vài phút xử lý client-side có thể mất 30s-2 phút, user cần biết nó chưa treo).
2. Xử lý lỗi: file quá lớn (giới hạn cảnh báo trước khi user upload file 1GB làm crash tab), clip không có audio track, font load fail.
3. Lưu tạm project state (thứ tự clip, trim points, title text) vào `IndexedDB` để không mất khi refresh nhầm — không cần backend, chỉ local storage.
4. Cleanup virtual FS sau mỗi lần export (ffmpeg.wasm giữ file trong memory, không dọn sẽ dễ tràn RAM khi export nhiều lần liên tiếp trong 1 session).

**Acceptance criteria:** Dùng liên tục 5-10 lần export trong 1 session không bị chậm dần/crash tab.

---

## Phase 6 (optional, làm sau nếu thấy chậm) — Nâng cấp multi-thread

Chỉ làm nếu đo thực tế thấy export quá chậm để chấp nhận được. Chuyển sang `@ffmpeg/core-mt`, cần set COOP/COEP header (đã bàn ở phần trước) — lúc này mới thật sự cần nghĩ tới việc host ở đâu để set được header, vì `vite preview`/static file mở trực tiếp bằng `file://` sẽ không set header được.

---

**Thứ tự ưu tiên nếu thời gian hạn chế:** Phase 0-1-2 là lõi bắt buộc (không có thì không phải editor). Phase 3-4 là tính năng đặc thù cho ranking video. Phase 5 có thể làm dần, không chặn việc dùng thử sớm.

Bạn muốn bắt đầu ngay từ Phase 0 — tôi dựng skeleton code luôn trong container này để bạn tải về chạy thử?
