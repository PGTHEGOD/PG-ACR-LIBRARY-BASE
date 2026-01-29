export interface CategoryStyle {
    bg: string
    text: string
}

export const categoryStyleMap: Record<string, CategoryStyle> = {
    "วิทยาการคอมพิวเตอร์ สารสนเทศ และงานทั่วไป": { bg: "#2563eb", text: "#ffffff" }, // Blue
    "ปรัชญาและจิตวิทยา": { bg: "#94a3b8", text: "#000000" }, // Silver
    "ศาสนา": { bg: "#8B4513", text: "#ffffff" }, // Brown
    "สังคมศาสตร์": { bg: "#06b6d4", text: "#000000" }, // Cyan
    "ภาษา": { bg: "#ec4899", text: "#ffffff" }, // Pink
    "วิทยาศาสตร์": { bg: "#dc2626", text: "#ffffff" }, // Red
    "เทคโนโลยี (หรือวิทยาศาสตร์ประยุกต์)": { bg: "#16a34a", text: "#ffffff" }, // Green
    "ศิลปะและนันทนาการ": { bg: "#f97316", text: "#000000" }, // Orange
    "วรรณกรรม": { bg: "#9333ea", text: "#ffffff" }, // Purple
    "ประวัติศาสตร์และภูมิศาสตร์": { bg: "#facc15", text: "#000000" }, // Yellow
    "เรื่องสั้น": { bg: "#a3ff79ff", text: "#000000" }, // Light Yellow
    "น.นวนิยาย": { bg: "#fef08a", text: "#000000" }, // Light Yellow
    "น.นิทาน": { bg: "#ffffffff", text: "#000000" }, // Lime
    "ส.สารคดี": { bg: "transparent", text: "#000000" },
    "ก.การศึกษา": { bg: "transparent", text: "#000000" },
    "ย.เยาวชน": { bg: "#d946ef", text: "#ffffff" }, // Magenta
    "ค.คู่มือ": { bg: "transparent", text: "#000000" },
    "อ้างอิง": { bg: "#000000", text: "#ffffff" }, // Black
}

export function getCategoryStyle(category: string): CategoryStyle {
    if (!category) return { bg: "transparent", text: "#000000" }
    if (categoryStyleMap[category]) {
        return categoryStyleMap[category]
    }
    const entry = Object.entries(categoryStyleMap).find(([key]) => category.includes(key) || key.includes(category))
    return entry ? entry[1] : { bg: "transparent", text: "#000000" }
}
