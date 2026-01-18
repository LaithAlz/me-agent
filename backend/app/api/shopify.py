from typing import Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field


router = APIRouter(prefix="/api/shopify", tags=["shopify"])


class ProductVariant(BaseModel):
	id: str
	title: str
	price: float
	sku: Optional[str] = None


class Product(BaseModel):
	id: str
	title: str
	vendor: str
	productType: str
	tags: List[str] = Field(default_factory=list)
	images: List[str] = Field(default_factory=list)
	variants: List[ProductVariant]
	inStock: Optional[bool] = None


class PurchaseHistoryItem(BaseModel):
	productId: str
	title: str
	vendor: str
	category: str
	price: float
	purchasedAt: str


class CartLineInput(BaseModel):
	merchandiseId: str
	quantity: int = Field(default=1, ge=1)


class CartCreateResponse(BaseModel):
	cartId: str


class CartLinesAddRequest(BaseModel):
	cartId: str
	lines: List[CartLineInput]


class CartLinesAddResponse(BaseModel):
	checkoutUrl: str


class CartLine(BaseModel):
	merchandiseId: str
	quantity: int


class Cart(BaseModel):
	id: str
	lines: List[CartLine] = Field(default_factory=list)
	checkoutUrl: Optional[str] = None


_DEFAULT_PRODUCTS: List[Product] = [
	Product(
		id="gid://shopify/Product/3001",
		title="Wireless Headphones",
		vendor="TechVendor",
		productType="Electronics",
		tags=["wireless", "audio"],
		images=["https://m.media-amazon.com/images/I/71YGski2TNL._AC_SL1500_.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/4001", title="Default", price=99.99)],
		inStock=True,
	),
	Product(
		id="gid://shopify/Product/3002",
		title="Smartphone Case",
		vendor="TechVendor",
		productType="Accessories",
		tags=["phone", "protection"],
		images=["https://upload.wikimedia.org/wikipedia/commons/9/92/Smartphone_with_case_cover_on_table.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/4002", title="Default", price=19.99)],
		inStock=True,
	),
	Product(
		id="gid://shopify/Product/3003",
		title="Laptop Stand",
		vendor="TechVendor",
		productType="Accessories",
		tags=["laptop", "ergonomic"],
		images=["https://upload.wikimedia.org/wikipedia/commons/5/51/Dell_laptop_on_a_stand_in_a_museum.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/4003", title="Default", price=49.99)],
		inStock=True,
	),
	Product(
		id="gid://shopify/Product/3004",
		title="Bluetooth Speaker",
		vendor="SoundWave",
		productType="Electronics",
		tags=["audio", "portable", "bluetooth"],
		images=["https://upload.wikimedia.org/wikipedia/commons/f/f9/Beats_By_Dr._Dre_Pill_Portable_Bluetooth_Speaker_Black_N2.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/4004", title="Default", price=79.99)],
		inStock=True,
	),
	Product(
		id="gid://shopify/Product/3005",
		title="Mechanical Keyboard",
		vendor="KeyPro",
		productType="Electronics",
		tags=["keyboard", "mechanical", "gaming"],
		images=["https://upload.wikimedia.org/wikipedia/commons/7/7f/Beautiful_Mechanical_Keyboard.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/4005", title="Default", price=129.99)],
		inStock=False,
	),
	Product(
		id="gid://shopify/Product/3006",
		title="Wireless Mouse",
		vendor="KeyPro",
		productType="Accessories",
		tags=["mouse", "wireless", "ergonomic"],
		images=["https://upload.wikimedia.org/wikipedia/commons/f/f1/A_black_wireless_computer_mouse.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/4006", title="Default", price=39.99)],
		inStock=True,
	),
	Product(
		id="gid://shopify/Product/3007",
		title="USB-C Charging Cable",
		vendor="ChargeIt",
		productType="Accessories",
		tags=["charging", "usb-c"],
		images=["https://upload.wikimedia.org/wikipedia/commons/3/36/Bad_USB-C_cable.agr.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/4007", title="Default", price=14.99)],
		inStock=True,
	),
	Product(
		id="gid://shopify/Product/3008",
		title="Smartwatch",
		vendor="FitTech",
		productType="Electronics",
		tags=["wearable", "fitness", "smart"],
		images=["https://upload.wikimedia.org/wikipedia/commons/a/a0/Android_Wear_Smartwatch-_LG_G_Watch_%2815051774155%29.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/4008", title="Default", price=199.99)],
		inStock=True,
	),
	Product(
		id="gid://shopify/Product/3009",
		title="Noise Cancelling Earbuds",
		vendor="SoundWave",
		productType="Electronics",
		tags=["audio", "wireless", "noise-cancelling"],
		images=["https://upload.wikimedia.org/wikipedia/commons/9/90/ActiveSound_wireless_earbuds_by_Hykker_%28POJM200483%29.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/4009", title="Default", price=149.99)],
		inStock=False,
	),
	Product(
		id="gid://shopify/Product/3010",
		title="Webcam 1080p",
		vendor="VisionTech",
		productType="Electronics",
		tags=["camera", "streaming", "remote-work"],
		images=["https://upload.wikimedia.org/wikipedia/commons/f/f5/Fancy_webcam_on_computer_screen.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/4010", title="Default", price=59.99)],
		inStock=True,
	),
	Product(
		id="gid://shopify/Product/3011",
		title="Reusable Water Bottle",
		vendor="GreenLife",
		productType="Lifestyle",
		tags=["eco-friendly", "hydration"],
		images=["https://upload.wikimedia.org/wikipedia/commons/0/03/JOB_water_bottle_%28cropped1%29.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/4011", title="Default", price=24.99)],
		inStock=True,
	),
	Product(
		id="gid://shopify/Product/3012",
		title="Aromatic Soy Candle",
		vendor="CozyCorner",
		productType="Home",
		tags=["home", "relaxation", "scented"],
		images=["https://upload.wikimedia.org/wikipedia/commons/4/43/Candle_%28Slava_celebration%29.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/4012", title="Default", price=18.50)],
		inStock=True,
	),
	Product(
		id="gid://shopify/Product/3013",
		title="Minimalist Backpack",
		vendor="UrbanCarry",
		productType="Fashion",
		tags=["travel", "fashion", "storage"],
		images=["https://upload.wikimedia.org/wikipedia/commons/a/a3/A_backpack_with_trekking_poles_and_shoes.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/4013", title="Default", price=89.99)],
		inStock=False,
	),
	Product(
		id="gid://shopify/Product/3014",
		title="Desk Plant (Succulent)",
		vendor="Plantify",
		productType="Home",
		tags=["plant", "decor", "workspace"],
		images=["https://upload.wikimedia.org/wikipedia/commons/5/57/Flickr_-_brewbooks_-_Succulent_Pot.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/4014", title="Default", price=15.99)],
		inStock=True,
	),
	Product(
		id="gid://shopify/Product/3015",
		title="Instant Ramen Variety Pack",
		vendor="NoodleHouse",
		productType="Grocery",
		tags=["food", "convenience", "snacks"],
		images=["https://upload.wikimedia.org/wikipedia/commons/1/16/Boxes_of_instant_noodles_on_a_supermarket_shelf%2C_with_the_words_%22First_In_First_Out_-_Retain_Freshness%22_written_on_them.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/4015", title="Default", price=9.99)],
		inStock=True,
	),
	Product(
		id="gid://shopify/Product/3016",
		title="Yoga Mat",
		vendor="ZenMotion",
		productType="Fitness",
		tags=["fitness", "wellness", "exercise"],
		images=["https://upload.wikimedia.org/wikipedia/commons/6/6e/Cotton_Yoga_Mats.png"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/4016", title="Default", price=44.99)],
		inStock=True,
	),
	Product(
		id="gid://shopify/Product/3017",
		title="Board Game: Monopoli",
		vendor="PlayForge",
		productType="Entertainment",
		tags=["games", "strategy", "multiplayer"],
		images=["https://upload.wikimedia.org/wikipedia/commons/7/78/Monopoly_board_on_white_bg.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/4017", title="Default", price=54.99)],
		inStock=True,
	),
	Product(
		id="gid://shopify/Product/3018",
		title="Vintage-Style Wall Clock",
		vendor="TimelessCo",
		productType="Home",
		tags=["decor", "timepiece", "vintage"],
		images=["https://upload.wikimedia.org/wikipedia/commons/4/4c/Clock_Gallery_-_retro_obchod_v_centru_Prahy.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/4018", title="Default", price=67.00)],
		inStock=False,
	),
	Product(
		id="gid://shopify/Product/3019",
		title="Cookbook: 30-Minute Meals",
		vendor="KitchenReads",
		productType="Books",
		tags=["cooking", "recipes", "healthy"],
		images=["https://upload.wikimedia.org/wikipedia/commons/8/8b/Anna_Howard_Shaw_in_the_Suffrage_Cookbook_1915.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/4019", title="Default", price=34.95)],
		inStock=True,
	),
	Product(
		id="gid://shopify/Product/3020",
		title="Noise-Reducing Sleep Mask",
		vendor="RestEasy",
		productType="Wellness",
		tags=["sleep", "wellness", "travel"],
		images=["https://upload.wikimedia.org/wikipedia/commons/a/a8/BDSM_Blindfold_Collar.png"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/4020", title="Default", price=22.99)],
		inStock=True,
	),
	Product(
		id="gid://shopify/Product/3101",
		title="Apple Magic Trackpad",
		vendor="Apple",
		productType="Office",
		tags=["office", "minimal", "ecosystem", "ergonomic"],
		images=["https://upload.wikimedia.org/wikipedia/commons/a/af/AppleMagicTrackpad.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/4101", title="Default", price=169.00)],
		inStock=True,
	),
	Product(
		id="gid://shopify/Product/3102",
		title="Apple Magic Keyboard",
		vendor="Apple",
		productType="Office",
		tags=["office", "minimal", "ecosystem"],
		images=["https://upload.wikimedia.org/wikipedia/commons/0/06/Apple_Magic_Keyboard_-_UK.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/4102", title="Default", price=99.00)],
		inStock=True,
	),
	Product(
		id="gid://shopify/Product/3103",
		title="Logitech MX Master 3S",
		vendor="Logitech",
		productType="Office",
		tags=["office", "ergonomic", "minimal"],
		images=["https://upload.wikimedia.org/wikipedia/commons/2/28/2017_Mysz_komputerowa_Logitech_MX_Master.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/4103", title="Default", price=99.99)],
		inStock=True,
	),
	Product(
		id="gid://shopify/Product/3104",
		title="Logitech MX Keys Mini",
		vendor="Logitech",
		productType="Office",
		tags=["office", "minimal", "quiet"],
		images=["https://upload.wikimedia.org/wikipedia/commons/7/78/Logitech_MX_Keys_YR0073_Wireless_Keyboard.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/4104", title="Default", price=99.99)],
		inStock=True,
	),
	Product(
		id="gid://shopify/Product/3105",
		title="Logitech Lift Vertical Mouse",
		vendor="Logitech",
		productType="Office",
		tags=["office", "ergonomic"],
		images=["https://upload.wikimedia.org/wikipedia/commons/b/b5/Delux_M618_vertical_mouse.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/4105", title="Default", price=69.99)],
		inStock=True,
	),
	Product(
		id="gid://shopify/Product/3106",
		title="Keychron K2 (Non-RGB)",
		vendor="Keychron",
		productType="Office",
		tags=["office", "minimal"],
		images=["https://upload.wikimedia.org/wikipedia/commons/6/67/End_-_Keychron_K8_Non-Backlight_Wireless_Mechanical_Keyboard.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/4106", title="Default", price=89.99)],
		inStock=True,
	),
	Product(
		id="gid://shopify/Product/3107",
		title="Generic RGB Mechanical Keyboard",
		vendor="Unknown",
		productType="Office",
		tags=["office", "RGB", "flashy", "unknown"],
		images=["https://upload.wikimedia.org/wikipedia/commons/0/0d/Logitech-g910_%2816093947623%29.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/4107", title="Default", price=89.99)],
		inStock=True,
	),
	Product(
		id="gid://shopify/Product/3108",
		title="Dell UltraSharp 27\" Monitor",
		vendor="Dell",
		productType="Office",
		tags=["office", "minimal", "monitor"],
		images=["https://upload.wikimedia.org/wikipedia/commons/7/73/Monitor_-_Flickr_-_davispuh.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/4108", title="Default", price=329.00)],
		inStock=True,
	),
	Product(
		id="gid://shopify/Product/3109",
		title="LG 27\" 4K Monitor",
		vendor="LG",
		productType="Office",
		tags=["office", "monitor"],
		images=["https://upload.wikimedia.org/wikipedia/commons/4/46/LG_%EC%9A%B8%ED%8A%B8%EB%9D%BC%EA%B8%B0%EC%96%B4_%EC%95%9E%EC%84%B8%EC%9B%8C_%EA%B2%8C%EC%9D%B4%EB%B0%8D_%EB%AA%A8%EB%8B%88%ED%84%B0_%EC%88%98%EC%9A%94_%EC%9E%A1%EB%8A%94%EB%8B%A4_-_50396067637.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/4109", title="Default", price=299.00)],
		inStock=True,
	),
	Product(
		id="gid://shopify/Product/3110",
		title="Samsung Curved Gaming Monitor",
		vendor="Samsung",
		productType="Office",
		tags=["office", "monitor", "flashy"],
		images=["https://upload.wikimedia.org/wikipedia/commons/9/9b/ILA_2010_Samstag_232.JPG"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/4110", title="Default", price=279.00)],
		inStock=True,
	),
	Product(
		id="gid://shopify/Product/3111",
		title="Fully Jarvis Standing Desk",
		vendor="Fully",
		productType="Office",
		tags=["office", "ergonomic", "standing_desk"],
		images=["https://upload.wikimedia.org/wikipedia/commons/4/48/Dmitri_Mendeleev%27s_standing_desk.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/4111", title="Default", price=499.00)],
		inStock=True,
	),
	Product(
		id="gid://shopify/Product/3112",
		title="IKEA BEKANT Desk",
		vendor="IKEA",
		productType="Office",
		tags=["office", "minimal", "desk"],
		images=["https://upload.wikimedia.org/wikipedia/commons/a/af/Ikea_Bekant_Sit_Stand_Desk_%2819548014198%29.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/4112", title="Default", price=249.00)],
		inStock=True,
	),
	Product(
		id="gid://shopify/Product/3113",
		title="Herman Miller Aeron Chair",
		vendor="Herman Miller",
		productType="Office",
		tags=["office", "ergonomic", "premium"],
		images=["https://upload.wikimedia.org/wikipedia/commons/d/d3/Aeron_Chair.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/4113", title="Default", price=1199.00)],
		inStock=True,
	),
	Product(
		id="gid://shopify/Product/3114",
		title="Budget Office Chair (No Name)",
		vendor="Unknown",
		productType="Office",
		tags=["office", "unknown"],
		images=["https://upload.wikimedia.org/wikipedia/commons/d/d4/Buerostuhl_%28fcm%29.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/4114", title="Default", price=89.00)],
		inStock=True,
	),
	Product(
		id="gid://shopify/Product/3115",
		title="Foot Rest Under Desk",
		vendor="Logitech",
		productType="Office",
		tags=["office", "ergonomic"],
		images=["https://upload.wikimedia.org/wikipedia/commons/0/07/Footrest_to_the_throne_of_King_William_III_of_the_Netherlands_%281842-1849%29.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/4115", title="Default", price=29.99)],
		inStock=True,
	),
	Product(
		id="gid://shopify/Product/3116",
		title="Bose QuietComfort Headphones",
		vendor="Bose",
		productType="Office",
		tags=["office", "minimal", "comfort", "audio"],
		images=["https://upload.wikimedia.org/wikipedia/commons/8/80/BOSE_QUIETCOMFORT_20_ACOUSTIC_NOISE_CANCELLING_HEADPHONE_FOR_APPLE_DEVICE.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/4116", title="Default", price=249.00)],
		inStock=True,
	),
	Product(
		id="gid://shopify/Product/3117",
		title="Sony WH-1000XM5 Headphones",
		vendor="Sony",
		productType="Office",
		tags=["office", "audio", "premium"],
		images=["https://upload.wikimedia.org/wikipedia/commons/d/d1/City_traffic_in_New_York_Texas_%28Unsplash%29.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/4117", title="Default", price=329.00)],
		inStock=True,
	),
	Product(
		id="gid://shopify/Product/3118",
		title="Anker PowerConf Speakerphone",
		vendor="Anker",
		productType="Office",
		tags=["office", "audio", "calls"],
		images=["https://upload.wikimedia.org/wikipedia/commons/f/ff/Bell_telephone_magazine_%281922%29_%2814569336880%29.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/4118", title="Default", price=119.00)],
		inStock=True,
	),
	Product(
		id="gid://shopify/Product/3119",
		title="Generic RGB Gaming Headset",
		vendor="Unknown",
		productType="Office",
		tags=["office", "RGB", "flashy", "unknown", "audio"],
		images=["https://upload.wikimedia.org/wikipedia/commons/b/be/Corsair_Gaming_logo.png"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/4119", title="Default", price=49.99)],
		inStock=True,
	),
	Product(
		id="gid://shopify/Product/3120",
		title="BenQ ScreenBar Monitor Light",
		vendor="BenQ",
		productType="Office",
		tags=["office", "minimal", "lighting"],
		images=["https://upload.wikimedia.org/wikipedia/commons/7/79/%27Pinus_sylvestris%27_Scots_Pine_at_Staplefield%2C_West_Sussex%2C_England_03.JPG"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/4120", title="Default", price=129.00)],
		inStock=True,
	),
	Product(
		id="gid://shopify/Product/3121",
		title="LED Strip Lights (RGB)",
		vendor="Unknown",
		productType="Office",
		tags=["office", "RGB", "flashy", "unknown", "lighting"],
		images=["https://upload.wikimedia.org/wikipedia/commons/f/f7/LED_strip_closeup.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/4121", title="Default", price=19.99)],
		inStock=True,
	),
	Product(
		id="gid://shopify/Product/3122",
		title="Cable Management Kit",
		vendor="IKEA",
		productType="Office",
		tags=["office", "minimal", "cables"],
		images=["https://upload.wikimedia.org/wikipedia/commons/1/1c/Bell_telephone_magazine_%281922%29_%2814752979481%29.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/4122", title="Default", price=24.99)],
		inStock=True,
	),
	Product(
		id="gid://shopify/Product/3124",
		title="Webcam 1080p",
		vendor="Logitech",
		productType="Office",
		tags=["office", "calls"],
		images=["https://upload.wikimedia.org/wikipedia/commons/f/f5/Fancy_webcam_on_computer_screen.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/4124", title="Default", price=59.99)],
		inStock=True,
	),
	Product(
		id="gid://shopify/Product/3125",
		title="Anker 65W USB-C Charger",
		vendor="Anker",
		productType="Office",
		tags=["office", "power", "minimal"],
		images=["https://upload.wikimedia.org/wikipedia/commons/a/a8/Apple_5W_USB_Power_Adapter_%284935%29.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/4125", title="Default", price=49.99)],
		inStock=True,
	),
	Product(
		id="gid://shopify/Product/3126",
		title="Belkin MagSafe Charger",
		vendor="Belkin",
		productType="Office",
		tags=["office", "power", "ecosystem"],
		images=["https://upload.wikimedia.org/wikipedia/commons/3/3e/Apple_iBook_Puck_Charger_Plug.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/4126", title="Default", price=39.99)],
		inStock=True,
	),
	Product(
		id="gid://shopify/Product/3127",
		title="Generic Fast Charger (RGB)",
		vendor="Unknown",
		productType="Office",
		tags=["office", "power", "RGB", "unknown"],
		images=["https://upload.wikimedia.org/wikipedia/commons/6/6c/ECig_recharging_on_iHome_dock.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/4127", title="Default", price=19.99)],
		inStock=True,
	),
	Product(
		id="gid://shopify/Product/3128",
		title="Philips Hue Starter Kit",
		vendor="Philips",
		productType="Smart_home",
		tags=["smart_home", "lighting", "minimal"],
		images=["https://upload.wikimedia.org/wikipedia/commons/8/8c/2006_Smart_ForFour_Brabus_%288085616829%29.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/4128", title="Default", price=199.00)],
		inStock=True,
	),
	Product(
		id="gid://shopify/Product/3129",
		title="Apple HomePod mini",
		vendor="Apple",
		productType="Smart_home",
		tags=["smart_home", "ecosystem", "audio"],
		images=["https://upload.wikimedia.org/wikipedia/commons/b/b9/Apple_HomePod_mini.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/4129", title="Default", price=99.00)],
		inStock=True,
	),
	Product(
		id="gid://shopify/Product/3130",
		title="Google Nest Thermostat",
		vendor="Google",
		productType="Smart_home",
		tags=["smart_home", "energy"],
		images=["https://upload.wikimedia.org/wikipedia/commons/3/39/Nest_Thermostat_E%2C_Oosterflank%2C_Rotterdam_%282020%29.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/4130", title="Default", price=129.00)],
		inStock=True,
	),
	Product(
		id="gid://shopify/Product/3131",
		title="Ring Video Doorbell",
		vendor="Ring",
		productType="Smart_home",
		tags=["smart_home", "security"],
		images=["https://upload.wikimedia.org/wikipedia/commons/0/0d/Hubble_reveals_the_Ring_Nebula%E2%80%99s_true_shape.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/4131", title="Default", price=99.00)],
		inStock=True,
	),
	Product(
		id="gid://shopify/Product/3132",
		title="DeWalt 20V Drill Driver Kit",
		vendor="DeWalt",
		productType="Construction",
		tags=["construction", "tools"],
		images=["https://upload.wikimedia.org/wikipedia/commons/1/11/A_boy_with_Down_syndrome_using_cordless_drill_to_assemble_a_book_case.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/4132", title="Default", price=199.00)],
		inStock=True,
	),
	Product(
		id="gid://shopify/Product/3133",
		title="Milwaukee Measuring Tape",
		vendor="Milwaukee",
		productType="Construction",
		tags=["construction", "tools"],
		images=["https://upload.wikimedia.org/wikipedia/commons/1/17/2023_Metr_krawiecki.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/4133", title="Default", price=19.99)],
		inStock=True,
	),
	Product(
		id="gid://shopify/Product/3134",
		title="Hammer",
		vendor="Stanley",
		productType="Construction",
		tags=["construction", "tools"],
		images=["https://upload.wikimedia.org/wikipedia/commons/8/84/Claw-hammer.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/4134", title="Default", price=14.99)],
		inStock=True,
	),
	Product(
		id="gid://shopify/Product/3135",
		title="Circular Saw",
		vendor="Makita",
		productType="Construction",
		tags=["construction", "tools"],
		images=["https://upload.wikimedia.org/wikipedia/commons/6/6e/Canton_Saw_Co_-_circular_saw_manufacturer_-_1915_ad.tiff"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/4135", title="Default", price=149.00)],
		inStock=True,
	),
	Product(
		id="gid://shopify/Product/3136",
		title="Safety Glasses",
		vendor="3M",
		productType="Construction",
		tags=["construction", "safety"],
		images=["https://upload.wikimedia.org/wikipedia/commons/4/4e/20200222_FIS_NC_COC_Eisenerz_PRC_HS109_Men_Manuel_Einkemmer_850_4588.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/4136", title="Default", price=9.99)],
		inStock=True,
	),
	Product(
		id="gid://shopify/Product/3137",
		title="Drywall Sheets (Pack)",
		vendor="Generic",
		productType="Construction",
		tags=["construction", "materials"],
		images=["https://upload.wikimedia.org/wikipedia/commons/c/c8/Drywall-screws-v1_%281%29.png"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/4137", title="Default", price=79.00)],
		inStock=True,
	),
	Product(
		id="gid://shopify/Product/3138",
		title="Interior Paint (Gallon)",
		vendor="Behr",
		productType="Construction",
		tags=["construction", "materials"],
		images=["https://upload.wikimedia.org/wikipedia/commons/3/3f/Anyone_Can_Use_Latex_Paint_Anytime_-_DPLA_-_6ade953208b5f2c500128a815f88ab8b.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/4138", title="Default", price=39.99)],
		inStock=True,
	),
	Product(
		id="gid://shopify/Product/3139",
		title="Toolbox",
		vendor="Husky",
		productType="Construction",
		tags=["construction", "tools"],
		images=["https://upload.wikimedia.org/wikipedia/commons/0/0a/Caisse_%C3%A0_outils_avec_petit_outillage.JPG"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/4139", title="Default", price=29.99)],
		inStock=True,
	),
	Product(
		id="gid://shopify/Product/3140",
		title="Samsung RGB Gaming Mouse",
		vendor="Samsung",
		productType="Office",
		tags=["office", "RGB", "flashy"],
		images=["https://upload.wikimedia.org/wikipedia/commons/4/42/G502_Hero.jpg"],
		variants=[ProductVariant(id="gid://shopify/ProductVariant/4140", title="Default", price=59.99)],
		inStock=True,
	),
]


PRODUCTS: List[Product] = list(_DEFAULT_PRODUCTS)


PURCHASE_HISTORY: Dict[str, List[PurchaseHistoryItem]] = {
	"alex": [
		PurchaseHistoryItem(
			productId="gid://shopify/Product/1101",
			title="Wireless Mouse",
			vendor="TechGear",
			category="electronics",
			price=29.99,
			purchasedAt="2024-10-02",
		),
		PurchaseHistoryItem(
			productId="gid://shopify/Product/1202",
			title="Denim Jeans",
			vendor="DenimCo",
			category="clothing",
			price=49.99,
			purchasedAt="2024-09-15",
		),
	],
	"jamie": [
		PurchaseHistoryItem(
			productId="gid://shopify/Product/1401",
			title="Yoga Mat",
			vendor="FitGear",
			category="sports",
			price=22.99,
			purchasedAt="2024-11-05",
		),
		PurchaseHistoryItem(
			productId="gid://shopify/Product/1302",
			title="Air Purifier",
			vendor="CleanAir",
			category="home",
			price=65.00,
			purchasedAt="2024-08-20",
		),
	],
}


CARTS: Dict[str, Cart] = {}
_cart_counter = 0


def _next_cart_id() -> str:
	global _cart_counter
	_cart_counter += 1
	return f"cart_{_cart_counter}"


@router.get("/products/search", response_model=List[Product])
def search_products(
	query: Optional[str] = Query(default=None, description="Search query"),
	category: Optional[str] = Query(default=None, description="Product category"),
	brand: Optional[str] = Query(default=None, description="Vendor/brand"),
	min_price: Optional[float] = Query(default=None, ge=0),
	max_price: Optional[float] = Query(default=None, ge=0),
	limit: int = Query(default=200, ge=1, le=500),
) -> List[Product]:
	results = PRODUCTS

	if query:
		q = query.lower()
		results = [p for p in results if q in p.title.lower() or q in p.vendor.lower() or any(q in t for t in p.tags)]

	if category:
		results = [p for p in results if p.productType == category]

	if brand:
		b = brand.lower()
		results = [p for p in results if b in p.vendor.lower()]

	if min_price is not None:
		results = [p for p in results if p.variants[0].price >= min_price]

	if max_price is not None:
		results = [p for p in results if p.variants[0].price <= max_price]

	return results[:limit]


@router.get("/personas/{persona_id}/history", response_model=List[PurchaseHistoryItem])
def get_purchase_history(persona_id: str) -> List[PurchaseHistoryItem]:
	return PURCHASE_HISTORY.get(persona_id, [])


@router.post("/cart/create", response_model=CartCreateResponse)
def cart_create() -> CartCreateResponse:
	cart_id = _next_cart_id()
	CARTS[cart_id] = Cart(id=cart_id, lines=[], checkoutUrl=None)
	return CartCreateResponse(cartId=cart_id)


@router.post("/cart/lines/add", response_model=CartLinesAddResponse)
def cart_lines_add(payload: CartLinesAddRequest) -> CartLinesAddResponse:
	cart = CARTS.get(payload.cartId)
	if not cart:
		raise HTTPException(status_code=404, detail="Cart not found")

	for line in payload.lines:
		cart.lines.append(CartLine(merchandiseId=line.merchandiseId, quantity=line.quantity))

	checkout_url = f"https://checkout.shopify.com/mock/{cart.id}"
	cart.checkoutUrl = checkout_url
	CARTS[cart.id] = cart

	return CartLinesAddResponse(checkoutUrl=checkout_url)
