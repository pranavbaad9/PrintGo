import build123d as bd

print("Generating Phase 2: Core Frame & Base Panels...")
t = 3 # thickness
w, d, h = 426, 400, 800

# 1. Floor Plate
with bd.BuildPart() as floor:
    bd.Box(w, d, t)
bd.export_step(floor.part, "Kiosk_Floor_Plate.step")
print("✅ Kiosk_Floor_Plate.step generated!")

# 2. Printer Shelf
with bd.BuildPart() as shelf:
    bd.Box(w - 2*t, d, t)
bd.export_step(shelf.part, "Internal_Printer_Shelf.step")
print("✅ Internal_Printer_Shelf.step generated!")

# 3. Left Side Panel
print("Generating Left Side Panel with Vents...")
with bd.BuildPart() as left_panel:
    bd.Box(t, d, h)
    # Vents
    for y_val in range(-120, 120, 30):
        for z_val in range(-300, 50, 30):
            with bd.Locations((0, y_val, z_val)):
                bd.Cylinder(radius=6, height=t*4, rotation=(0, 90, 0), mode=bd.Mode.SUBTRACT)
bd.export_step(left_panel.part, "Left_Side_Panel.step")
print("✅ Left_Side_Panel.step generated!")

# 4. Right Side Panel
print("Generating Right Side Panel with Vents...")
with bd.BuildPart() as right_panel:
    bd.Box(t, d, h)
    # Vents
    for y_val in range(-120, 120, 30):
        for z_val in range(-300, 50, 30):
            with bd.Locations((0, y_val, z_val)):
                bd.Cylinder(radius=6, height=t*4, rotation=(0, 90, 0), mode=bd.Mode.SUBTRACT)
bd.export_step(right_panel.part, "Right_Side_Panel.step")
print("✅ Right_Side_Panel.step generated!")

print("All Phase 2 parts generated successfully.")
