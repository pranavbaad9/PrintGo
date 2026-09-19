import build123d as bd
import os

print("Generating Phase 1: Reference Hardware Dummy Blocks...")

# 1. HP Printer Dummy
# Dimensions: 401 x 362 x 367 mm
with bd.BuildPart() as printer:
    bd.Box(401, 362, 367)
bd.export_step(printer.part, "HP_Printer_Dummy.step")
print("✅ HP_Printer_Dummy.step generated!")

# 2. 15" LCD Monitor Dummy
# Dimensions: 340 x 50 x 270 mm
with bd.BuildPart() as monitor:
    bd.Box(340, 50, 270)
bd.export_step(monitor.part, "LCD_Monitor_Dummy.step")
print("✅ LCD_Monitor_Dummy.step generated!")

# 3. Raspberry Pi Dummy
# Dimensions: 85 x 56 x 20 mm
with bd.BuildPart() as pi:
    bd.Box(85, 56, 20)
bd.export_step(pi.part, "RaspberryPi_Dummy.step")
print("✅ RaspberryPi_Dummy.step generated!")

print("All Phase 1 parts generated successfully.")
