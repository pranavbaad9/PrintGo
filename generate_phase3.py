import build123d as bd
import os

print("Generating Phase 3: Front & Back Panels...")
t = 3
w, h = 426, 800

# 1. Front Fascia
with bd.BuildPart() as front:
    bd.Box(w, t, h)
    # Paper slot located perfectly for the printer
    with bd.Locations((0, 0, 50)):
        bd.Box(280, t*4, 15, mode=bd.Mode.SUBTRACT)
bd.export_step(front.part, "Front_Fascia.step")
print("✅ Front_Fascia.step generated!")

# 2. Rear Frame
with bd.BuildPart() as rear_frame:
    bd.Box(w, t, h)
    with bd.Locations((0, 0, 0)):
        bd.Box(w - 60, t*4, h - 100, mode=bd.Mode.SUBTRACT)
bd.export_step(rear_frame.part, "Rear_Frame.step")
print("✅ Rear_Frame.step generated!")

# 3. Rear Access Door (slightly smaller for clearance)
with bd.BuildPart() as rear_door:
    bd.Box(w - 64, t, h - 104)
bd.export_step(rear_door.part, "Rear_Access_Door.step")
print("✅ Rear_Access_Door.step generated!")

print("All Phase 3 parts generated successfully.")
