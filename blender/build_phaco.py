"""
Phaco Academy - Blender master model builder.

Builds the same named-part phaco system used by the web app (js/model.js), with:
  * one Collection per category, one Empty (parent) per part, natural PBR materials
  * custom property "explode" on each part + a driver-friendly scene property "Explode" (0..1)
  * an "X-Ray" view toggle (viewport x-ray + wireframe overlay) via scene property
  * export to ../assets/phaco.glb

Run:  blender --background --python build_phaco.py
  or: open Blender > Scripting tab > open this file > Run Script.
Coordinates: Blender Z-up (web app is Y-up; glTF exporter converts automatically).
"""
import bpy, math, os
from mathutils import Vector

OUT = os.path.join(os.path.dirname(bpy.data.filepath or __file__), "..", "assets", "phaco.glb")

# ---------- materials (natural colours) ----------
def mat(name, rgb, metal=0.0, rough=0.5, alpha=1.0, transmission=0.0, emission=None):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get("Principled BSDF")
    b.inputs["Base Color"].default_value = (*rgb, 1)
    b.inputs["Metallic"].default_value = metal
    b.inputs["Roughness"].default_value = rough
    b.inputs["Alpha"].default_value = alpha
    key = "Transmission Weight" if "Transmission Weight" in b.inputs else "Transmission"
    b.inputs[key].default_value = transmission
    if emission:
        ek = "Emission Color" if "Emission Color" in b.inputs else "Emission"
        b.inputs[ek].default_value = (*emission, 1)
    if alpha < 1 or transmission > 0:
        m.blend_method = "BLEND" if hasattr(m, "blend_method") else None
    return m

def hexrgb(h):
    return tuple(((h >> s) & 255) / 255 for s in (16, 8, 0))

MAT = {}
MAT_SPECS = [
    ("Shell", 0xECEAE4, dict(rough=0.35)), ("Trim", 0x5B6B7A, dict(rough=0.4)),
    ("Dark", 0x2A2D31, dict(rough=0.6)), ("Rubber", 0x151515, dict(rough=0.9)),
    ("Steel", 0xC9CDD1, dict(metal=1, rough=0.25)), ("Titanium", 0xB8B4AB, dict(metal=1, rough=0.32)),
    ("Glass", 0xFFFFFF, dict(rough=0.05, alpha=0.3, transmission=1)), ("BSS", 0xDFF2FF, dict(rough=0.05, alpha=0.5, transmission=0.9)),
    ("PVC", 0xF4FBFF, dict(rough=0.15, alpha=0.45, transmission=0.8)), ("Silicone", 0xD8E3EA, dict(rough=0.3, alpha=0.7, transmission=0.6)),
    ("PZT", 0xC98A3D, dict(rough=0.55)), ("Copper", 0xB87333, dict(metal=1, rough=0.35)),
    ("PCB", 0x1F6E43, dict(rough=0.6)), ("BlueCap", 0x2D6FB7, dict(rough=0.45)),
    ("Bag", 0xEEF6F2, dict(rough=0.3, alpha=0.55, transmission=0.7)), ("Screen", 0x0D1B2A, dict(rough=0.2, emission=(0.05, 0.12, 0.2))),
    ("CassetteWhite", 0xF3F6F8, dict(rough=0.4)), ("FootGrey", 0x3A4048, dict(rough=0.55)),
]

# ---------- helpers (web coords x,y(up),z(front) -> blender x,-z,y) ----------
def B(x, y, z): return Vector((x, -z, y))

def add(obj, parent, m):
    obj.data.materials.append(MAT[m]); obj.parent = parent
    for c in obj.users_collection: c.objects.unlink(obj)
    parent.users_collection[0].objects.link(obj)
    return obj

def box(parent, m, size, pos, bevel=0.006):
    bpy.ops.mesh.primitive_cube_add(size=1, location=B(*pos))
    o = bpy.context.active_object; o.scale = (size[0], size[2], size[1])
    bpy.ops.object.transform_apply(scale=True)
    if bevel:
        mod = o.modifiers.new("Bevel", "BEVEL"); mod.width = bevel; mod.segments = 3
    bpy.ops.object.shade_smooth()
    return add(o, parent, m)

def cyl(parent, m, r, h, pos, axis="y", r2=None, verts=32):
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r2 if r2 is not None else r, radius2=r, depth=h, location=B(*pos))
    o = bpy.context.active_object
    o.rotation_euler = {"y": (0, 0, 0), "x": (0, math.pi / 2, 0), "z": (math.pi / 2, 0, 0)}[axis]
    bpy.ops.object.shade_smooth()
    return add(o, parent, m)

def tube(parent, m, pts, r=0.003):
    cu = bpy.data.curves.new("tube", "CURVE"); cu.dimensions = "3D"; cu.bevel_depth = r; cu.bevel_resolution = 4
    sp = cu.splines.new("NURBS"); sp.points.add(len(pts) - 1)
    for p, c in zip(sp.points, pts): p.co = (*B(*c), 1)
    sp.use_endpoint_u = True; sp.order_u = min(4, len(pts))
    o = bpy.data.objects.new("tube", cu); parent.users_collection[0].objects.link(o)
    o.parent = parent; o.data.materials.append(MAT[m])
    return o

COLL = {}
def part(pid, label, category, explode, internal=False):
    if category not in COLL:
        c = bpy.data.collections.new(category); bpy.context.scene.collection.children.link(c); COLL[category] = c
    e = bpy.data.objects.new(pid, None); COLL[category].objects.link(e)
    e["label"] = label; e["category"] = category; e["internal"] = internal
    e["explode"] = list(B(*explode))
    # Driver: location = explode * scene.Explode
    for i in range(3):
        d = e.driver_add("location", i).driver
        v = d.variables.new(); v.name = "t"; v.targets[0].id_type = "SCENE"; v.targets[0].id = bpy.context.scene; v.targets[0].data_path = '["Explode"]'
        d.expression = f"t*{e['explode'][i]:.4f}"
    return e

# ---------- build ----------
def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene; sc["Explode"] = 0.0
    MAT.clear(); MAT.update({k: mat(k, hexrgb(c), **kw) for k, c, kw in MAT_SPECS})

    p = part("cart", "Mobile cart & casters", "Console", (0, -0.12, 0))
    box(p, "Trim", (0.62, 0.1, 0.56), (0, 0.11, 0), 0.02)
    for x, z in [(-0.26, -0.23), (0.26, -0.23), (-0.26, 0.23), (0.26, 0.23)]:
        cyl(p, "Rubber", 0.035, 0.025, (x, 0.035, z), "x"); cyl(p, "Steel", 0.008, 0.05, (x, 0.07, z))

    p = part("console", "Console housing", "Console", (0, 0, 0))
    box(p, "Shell", (0.5, 0.72, 0.45), (0, 0.52, 0), 0.03); box(p, "Trim", (0.505, 0.03, 0.455), (0, 0.875, 0))

    p = part("screen", "Touchscreen GUI", "Interface", (0, 0.35, 0.1))
    cyl(p, "Steel", 0.028, 0.12, (0, 0.94, -0.05))
    pod = box(p, "Dark", (0.46, 0.34, 0.045), (0, 1.08, 0), 0.015); pod.rotation_euler[0] = -0.35
    s = box(p, "Screen", (0.42, 0.3, 0.004), (0, 1.087, 0.02), 0); s.rotation_euler[0] = -0.35

    p = part("cassette", "Fluidics cassette", "Fluidics", (0, 0, 0.35))
    box(p, "CassetteWhite", (0.13, 0.16, 0.025), (-0.1, 0.68, 0.24)); box(p, "BlueCap", (0.135, 0.02, 0.028), (-0.1, 0.765, 0.24))

    p = part("pump", "Peristaltic pump head", "Fluidics", (0, 0, 0.2))
    cyl(p, "Steel", 0.04, 0.02, (-0.1, 0.66, 0.218), "z")
    for i in range(6):
        a = i / 6 * math.tau; cyl(p, "Dark", 0.006, 0.022, (-0.1 + math.cos(a) * 0.032, 0.66 + math.sin(a) * 0.032, 0.219), "z")

    p = part("ports", "Handpiece connector panel", "Interface", (0.1, 0, 0.25))
    box(p, "Dark", (0.2, 0.08, 0.01), (0.12, 0.45, 0.226), 0.003)
    for x in (0.06, 0.12, 0.18): cyl(p, "Steel", 0.013, 0.012, (x, 0.45, 0.234), "z")

    p = part("powerSwitch", "Power switch", "Interface", (-0.1, 0, 0.2)); cyl(p, "Dark", 0.014, 0.01, (-0.18, 0.3, 0.228), "z")
    p = part("rearPanel", "Rear panel", "Interface", (0, 0, -0.25)); box(p, "Dark", (0.3, 0.12, 0.01), (0, 0.3, -0.228), 0.003)
    tube(p, "Rubber", [(-0.08, 0.3, -0.24), (-0.1, 0.2, -0.32), (-0.2, 0.02, -0.4), (-0.4, 0.01, -0.5)], 0.005)

    p = part("psu", "Power supply unit", "Internal", (-0.35, -0.05, 0), True); box(p, "Steel", (0.18, 0.12, 0.25), (-0.12, 0.25, -0.05))
    p = part("generator", "Ultrasound generator", "Internal", (0.35, 0.05, 0), True); box(p, "PCB", (0.02, 0.22, 0.3), (0.2, 0.55, -0.02), 0.002)
    cyl(p, "Copper", 0.025, 0.02, (0.185, 0.6, 0.06), "x")
    p = part("cpu", "Control computer", "Internal", (0, 0.1, -0.35), True); box(p, "PCB", (0.3, 0.2, 0.02), (0, 0.6, -0.19), 0.002)
    p = part("motor", "Pump motor & vacuum sensor", "Internal", (-0.1, 0, 0.1), True); cyl(p, "Dark", 0.035, 0.1, (-0.1, 0.66, 0.15), "z")

    p = part("ivPole", "Motorised IV pole", "Fluidics", (0, 0.15, -0.1))
    cyl(p, "Steel", 0.016, 0.6, (-0.2, 1.18, -0.15)); cyl(p, "Steel", 0.011, 0.55, (-0.2, 1.62, -0.15))
    p = part("bottle", "BSS bottle", "Fluidics", (-0.15, 0.3, 0))
    cyl(p, "Glass", 0.045, 0.17, (-0.2, 1.73, -0.1)); cyl(p, "BSS", 0.042, 0.14, (-0.2, 1.71, -0.1)); cyl(p, "BlueCap", 0.017, 0.015, (-0.2, 1.61, -0.1))
    p = part("drip", "Spike & drip chamber", "Fluidics", (-0.2, 0.15, 0.1)); cyl(p, "PVC", 0.012, 0.06, (-0.2, 1.54, -0.1))
    p = part("irrigLine", "Irrigation tubing", "Fluidics", (-0.05, 0.05, 0.15))
    tube(p, "PVC", [(-0.2, 1.51, -0.1), (-0.25, 1.2, 0.1), (-0.18, 0.85, 0.25), (-0.13, 0.74, 0.26)])
    tube(p, "PVC", [(-0.06, 0.73, 0.26), (0.1, 0.8, 0.32), (0.28, 0.9, 0.24), (0.3, 0.892, 0.14)], 0.0028)
    p = part("aspLine", "Aspiration tubing", "Fluidics", (0.05, 0.05, 0.15))
    tube(p, "PVC", [(-0.06, 0.62, 0.26), (0.1, 0.7, 0.36), (0.3, 0.88, 0.3), (0.31, 0.892, 0.14)], 0.0028)
    p = part("drainBag", "Drainage bag", "Fluidics", (-0.3, 0, 0.1)); box(p, "Bag", (0.11, 0.18, 0.02), (-0.32, 0.55, 0.12), 0.01)

    p = part("tray", "Instrument tray", "Accessories", (0.15, 0, 0)); box(p, "Steel", (0.2, 0.008, 0.26), (0.37, 0.875, 0.08), 0.003)
    HY, HZ = 0.892, 0.14
    p = part("hpShell", "Phaco handpiece body", "Handpiece", (0, 0.08, 0.1))
    cyl(p, "Titanium", 0.011, 0.11, (0.36, HY, HZ), "x", r2=0.012); cyl(p, "Titanium", 0.007, 0.025, (0.43, HY, HZ), "x", r2=0.012)
    p = part("crystals", "Piezoelectric crystals", "Handpiece", (0, 0.16, 0.1), True)
    for i in range(4): cyl(p, "PZT", 0.008, 0.006, (0.335 + i * 0.008, HY, HZ), "x"); cyl(p, "Copper", 0.0082, 0.0012, (0.339 + i * 0.008, HY, HZ), "x")
    p = part("horn", "Titanium horn", "Handpiece", (0, 0.12, 0.13), True); cyl(p, "Titanium", 0.004, 0.06, (0.395, HY, HZ), "x", r2=0.0075)
    p = part("tip", "Phaco tip", "Handpiece", (0.12, 0.05, 0.1)); cyl(p, "Titanium", 0.0005, 0.028, (0.457, HY, HZ), "x", r2=0.0006)
    p = part("sleeve", "Silicone sleeve", "Handpiece", (0.18, 0.1, 0.1)); cyl(p, "Silicone", 0.0015, 0.022, (0.455, HY, HZ), "x", r2=0.004)
    p = part("testChamber", "Test chamber", "Accessories", (0.25, 0.1, 0.1)); cyl(p, "Silicone", 0.006, 0.02, (0.3, 0.885, 0.0), "x")
    p = part("iaHandpiece", "I/A handpiece", "Handpiece", (0.1, 0.05, -0.15)); cyl(p, "Steel", 0.008, 0.11, (0.36, 0.888, 0.05), "x", r2=0.009)
    p = part("wrench", "Tip wrench", "Accessories", (0.25, 0.05, -0.1)); cyl(p, "Steel", 0.006, 0.05, (0.38, 0.884, 0.0), "x")

    p = part("footBase", "Footswitch housing", "Footswitch", (0, -0.02, 0.35)); box(p, "FootGrey", (0.34, 0.06, 0.28), (0, 0.035, 0.68), 0.02)
    box(p, "BlueCap", (0.04, 0.04, 0.08), (-0.15, 0.08, 0.66)); box(p, "BlueCap", (0.04, 0.04, 0.08), (0.15, 0.08, 0.66))
    p = part("pedal", "Treadle", "Footswitch", (0, 0.15, 0.35)); box(p, "Rubber", (0.18, 0.012, 0.22), (0, 0.075, 0.66), 0.006)

    # lighting / camera for renders
    bpy.ops.object.light_add(type="AREA", location=(2, -3, 3)); bpy.context.active_object.data.energy = 600
    bpy.ops.object.camera_add(location=(1.9, -1.9, 1.45), rotation=(math.radians(72), 0, math.radians(45)))
    sc.camera = bpy.context.active_object

def set_xray(on=True):
    """Viewport X-ray + wireframe overlay in every 3D view."""
    for area in bpy.context.screen.areas if bpy.context.screen else []:
        if area.type == "VIEW_3D":
            sh = area.spaces[0].shading; sh.show_xray = on; sh.xray_alpha = 0.15
            area.spaces[0].overlay.show_wireframes = on

def export():
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=os.path.abspath(OUT), export_format="GLB", export_extras=True, export_apply=True)
    print("Exported", os.path.abspath(OUT))
    bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(OUT.replace(".glb", ".blend")))
    sc = bpy.context.scene; sc.render.resolution_x, sc.render.resolution_y = 1200, 900
    sc.world = bpy.data.worlds.new("W"); sc.world.color = (0.85, 0.88, 0.9)
    for t, name in ((0.0, "preview.png"), (1.0, "preview_exploded.png")):
        sc["Explode"] = t; bpy.context.view_layer.update()
        sc.render.filepath = os.path.abspath(os.path.join(os.path.dirname(OUT), name))
        bpy.ops.render.render(write_still=True)
    sc["Explode"] = 0.0

if __name__ == "__main__":
    build()
    try: set_xray(False)
    except Exception: pass
    export()

