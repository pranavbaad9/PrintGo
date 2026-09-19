import build123d as bd

t = 3  # sheet metal thickness
w, d, h = 460, 460, 800  # Main body dimensions

print("Generating Kiosk Base...")
with bd.BuildPart() as kiosk:
    # 1. Outer base box
    bd.Box(w, d, h)
    
    # 2. Hollow out interior
    with bd.Locations((0, 0, 0)):
        bd.Box(w - 2*t, d - 2*t, h - 2*t, mode=bd.Mode.SUBTRACT)
    
    # 3. Rear door cut (for maintenance)
    with bd.Locations((0, d/2, 0)):
        bd.Box(w - 60, t*4, h - 100, mode=bd.Mode.SUBTRACT)
        
    # 4. Paper slot cut on front
    with bd.Locations((0, -d/2, -50)):
        bd.Box(280, t*4, 15, mode=bd.Mode.SUBTRACT)

    # 5. Printer shelf inside
    with bd.Locations((0, 0, -h/2 + 250)):
        bd.Box(w - 2*t, d - 2*t, t, mode=bd.Mode.ADD)
        
    # 6. Vents on sides (Cut cylinders along X axis)
    print("Generating Ventilation Grills...")
    for y_val in range(-120, 120, 30):
        for z_val in range(-300, 50, 30):
            with bd.Locations((0, y_val, z_val)):
                bd.Cylinder(radius=6, height=w+10, rotation=(0, 90, 0), mode=bd.Mode.SUBTRACT)

    # 7. Monitor Head
    print("Generating Monitor Head and VESA mounts...")
    head_w = w
    head_d = 120
    head_h = 400
    head_angle = 15
    
    # Build head separately
    with bd.BuildPart() as head:
        bd.Box(head_w, head_d, head_h)
        bd.Box(head_w - 2*t, head_d - 2*t, head_h - 2*t, mode=bd.Mode.SUBTRACT)
        
        # Screen cutout on front face
        with bd.Locations((0, -head_d/2, 0)):
            bd.Box(310, t*4, 230, mode=bd.Mode.SUBTRACT)
            
        # Add VESA mount bracket inside
        with bd.Locations((0, -head_d/2 + 25, 0)):
            bd.Box(120, t, 120, mode=bd.Mode.ADD)
            # Cut VESA holes (100x100mm pattern)
            with bd.Locations((-50, 0, 50), (50, 0, 50), (-50, 0, -50), (50, 0, -50)):
                bd.Cylinder(radius=2.5, height=t*4, rotation=(90, 0, 0), mode=bd.Mode.SUBTRACT)
                
    # Position the head on top of the base at an angle and add it
    with bd.Locations(bd.Location((0, 50, h/2 + head_h/2 - 20), (head_angle, 0, 0))):
        bd.add(head.part)

print("Exporting STEP file (this may take a few seconds)...")
bd.export_step(kiosk.part, "PrintGo_Kiosk_Final.step")
print("✅ PrintGo_Kiosk_Final.step generated successfully!")
