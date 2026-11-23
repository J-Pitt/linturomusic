#!/bin/bash
set -e

# Variables
INPUT_VIDEO="design/street-runner.mp4"
LOGO="design/linturo-logo-glitch.png"
OUTPUT="output/linturo-5min-branded.mp4"
DURATION=300  # 5 minutes

echo "Creating 5-minute branded video with Linturo graphics at 1024x1024..."

# Step 1: Create intro card (2 seconds, fade in from black) at 1024x1024
echo "Step 1: Creating intro card with fade in..."
ffmpeg -y -f lavfi -i color=black:s=1024x1024:d=2:r=12 -loop 1 -i "$LOGO" -filter_complex \
"[1:v]scale=700:-2[logo];[0:v][logo]overlay=(W-w)/2:(H-h)/2,fade=in:st=0:d=1[v]" \
-map "[v]" -t 2 -pix_fmt yuv420p -c:v libx264 -preset medium -crf 23 /tmp/intro_1024.mp4

# Step 2: Loop the video to 5 minutes and add logo overlay in top right at 1024x1024
echo "Step 2: Looping main video to 5 minutes with logo overlay..."
ffmpeg -y -stream_loop 59 -i "$INPUT_VIDEO" -loop 1 -i "$LOGO" -filter_complex \
"[1:v]scale=150:-2[logo];[0:v][logo]overlay=W-w-30:30[v]" \
-map "[v]" -t $DURATION -c:v libx264 -preset medium -crf 23 -pix_fmt yuv420p /tmp/main_1024.mp4

# Step 3: Create outro card (2 seconds, fade out to black) at 1024x1024
echo "Step 3: Creating outro card with fade out..."
ffmpeg -y -f lavfi -i color=black:s=1024x1024:d=2:r=12 -loop 1 -i "$LOGO" -filter_complex \
"[1:v]scale=700:-2[logo];[0:v][logo]overlay=(W-w)/2:(H-h)/2,fade=out:st=1:d=1[v]" \
-map "[v]" -t 2 -pix_fmt yuv420p -c:v libx264 -preset medium -crf 23 /tmp/outro_1024.mp4

# Step 4: Concatenate intro + main + outro
echo "Step 4: Concatenating all parts..."
echo "file '/tmp/intro_1024.mp4'" > /tmp/concat_list.txt
echo "file '/tmp/main_1024.mp4'" >> /tmp/concat_list.txt
echo "file '/tmp/outro_1024.mp4'" >> /tmp/concat_list.txt

ffmpeg -y -f concat -safe 0 -i /tmp/concat_list.txt \
-c copy "$OUTPUT"

echo ""
echo "✅ Video created successfully!"
echo "📁 Location: $OUTPUT"
ls -lh "$OUTPUT"
echo ""
echo "📊 Video details:"
ffprobe -v error -show_entries stream=width,height,codec_name,r_frame_rate -show_entries format=duration,size -of default=noprint_wrappers=1 "$OUTPUT"
echo ""
echo "🎬 Ready for social media! The video includes:"
echo "   • Opening fade-in Linturo card (2 seconds)"
echo "   • Main content with logo in top right (5 minutes)"
echo "   • Closing fade-out Linturo card (2 seconds)"
echo "   • Total duration: ~5 minutes 4 seconds"
