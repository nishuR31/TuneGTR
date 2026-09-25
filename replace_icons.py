from PIL import Image
import os

img_path = "/home/nishu/.gemini/antigravity-ide/brain/924a5316-d945-4f6a-bffc-cc5730d1b5a0/guitar_tuner_icon_1790329170693.jpg"
out_dir = "/home/nishu/TechStack/codes/guitar-tool/apps/mobile/assets"

# Open image
img = Image.open(img_path).convert("RGBA")

# Resize if needed
icon = img.resize((1024, 1024), Image.Resampling.LANCZOS)
favicon = img.resize((48, 48), Image.Resampling.LANCZOS)
splash = img.resize((1284, 2778), Image.Resampling.LANCZOS) # Just an example splash size, though usually we want to center the icon on a solid bg

# For splash, it's better to create a solid background and paste the icon in the center
splash_bg = Image.new("RGBA", (1284, 2778), (11, 18, 42, 255)) # dark blue bg
icon_for_splash = img.resize((512, 512), Image.Resampling.LANCZOS)
splash_bg.paste(icon_for_splash, ((1284-512)//2, (2778-512)//2))

# Save all icon variants
icon.save(os.path.join(out_dir, "icon-light.png"))
icon.save(os.path.join(out_dir, "icon-dark.png"))
icon.save(os.path.join(out_dir, "adaptive-foreground-light.png"))
icon.save(os.path.join(out_dir, "adaptive-foreground-dark.png"))

# Save favicon
favicon.save(os.path.join(out_dir, "favicon.png"))
favicon.save(os.path.join(out_dir, "favicon-light.png"))
favicon.save(os.path.join(out_dir, "favicon-dark.png"))

# Save splash
splash_bg.save(os.path.join(out_dir, "splash-light.png"))
splash_bg.save(os.path.join(out_dir, "splash-dark.png"))

print("Icons replaced successfully!")
