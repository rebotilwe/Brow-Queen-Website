const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { v4: uuidv4 } = require('uuid');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// ============ TEMPORARY IN-MEMORY STORAGE ============
let tempBookings = [];
let tempServices = [
    { id: 1, name: 'Brow Shaping', duration: 45, price: 280 },
    { id: 2, name: 'Brow Tinting', duration: 20, price: 150 },
    { id: 3, name: 'Hybrid Tint', duration: 40, price: 350 },
    { id: 4, name: 'Henna Brows', duration: 60, price: 380 },
    { id: 5, name: 'Brow Lamination', duration: 60, price: 500 },
    { id: 6, name: 'Brow Extensions', duration: 90, price: 950 },
    { id: 7, name: 'Microblading', duration: 180, price: 3500 },
    { id: 8, name: 'Ombre Powder', duration: 180, price: 3800 },
    { id: 9, name: 'Combo Brows', duration: 210, price: 4500 },
    { id: 10, name: 'Brow Mapping', duration: 30, price: 200 },
    { id: 11, name: 'Fill & Styling', duration: 30, price: 300 },
    { id: 12, name: 'The Royal Duo', duration: 120, price: 1200 }
];

// ============ SETTINGS STORAGE ============
let settings = {
    operatingHours: {
        monday: { enabled: true, start: '09:00', end: '18:00' },
        tuesday: { enabled: true, start: '09:00', end: '18:00' },
        wednesday: { enabled: true, start: '09:00', end: '18:00' },
        thursday: { enabled: true, start: '09:00', end: '18:00' },
        friday: { enabled: true, start: '09:00', end: '18:00' },
        saturday: { enabled: true, start: '09:00', end: '18:00' },
        sunday: { enabled: false, start: '09:00', end: '18:00' }
    },
    blockedDates: [],
    slotDuration: 30
};

// ============ HELPER FUNCTIONS ============
function getBookedSlotsForDate(date) {
    return tempBookings
        .filter(b => b.appointment_date === date && (b.status === 'pending' || b.status === 'confirmed'))
        .map(b => b.appointment_time);
}

function isDateBlocked(date) {
    return settings.blockedDates.some(blocked => blocked.date === date);
}

function isDayEnabled(dateObj) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = days[dateObj.getDay()];
    return settings.operatingHours[dayName]?.enabled || false;
}

// ============ API ENDPOINTS ============

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Brow Queen API is running' });
});

// Get all services
app.get('/api/services', (req, res) => {
    res.json(tempServices);
});

// Get public settings for customer
app.get('/api/settings', (req, res) => {
    res.json({
        operatingHours: settings.operatingHours,
        blockedDates: settings.blockedDates,
        slotDuration: settings.slotDuration
    });
});

// Get available time slots for a date
app.get('/api/available-slots/:date', (req, res) => {
    try {
        const { date } = req.params;
        const dateObj = new Date(date);
        const bookedSlots = getBookedSlotsForDate(date);
        
        // Check if date is blocked or day is closed
        const isBlocked = isDateBlocked(date);
        const isDayClosed = !isDayEnabled(dateObj);
        
        if (isBlocked || isDayClosed) {
            return res.json({ available_slots: [], booked_slots: bookedSlots, is_blocked: true });
        }
        
        const allSlots = [
            "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
            "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
            "15:00", "15:30", "16:00", "16:30", "17:00", "17:30"
        ];
        
        const availableSlots = allSlots.filter(slot => !bookedSlots.includes(slot));
        
        res.json({ available_slots: availableSlots, booked_slots: bookedSlots, is_blocked: false });
    } catch (error) {
        console.error('Error getting slots:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create new booking
app.post('/api/bookings', async (req, res) => {
    try {
        const { customer_name, customer_email, customer_phone, service_id, service_name, appointment_date, appointment_time, notes, participants, price } = req.body;
        
        // Check if slot is already booked
        const bookedSlots = getBookedSlotsForDate(appointment_date);
        if (bookedSlots.includes(appointment_time)) {
            return res.status(409).json({ error: 'This time slot is already booked. Please select another time.' });
        }
        
        const bookingNumber = `BQ-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        
        const newBooking = {
            id: tempBookings.length + 1,
            booking_number: bookingNumber,
            customer_name,
            customer_email,
            customer_phone,
            service_id: parseInt(service_id),
            service_name,
            appointment_date,
            appointment_time,
            notes: notes || '',
            participants: participants || 1,
            price: price || 0,
            status: 'pending',
            created_at: new Date().toISOString()
        };
        
        tempBookings.push(newBooking);
        
        console.log('✅ New booking created:', {
            bookingNumber,
            customer_name,
            service_name,
            appointment_date,
            appointment_time,
            participants: participants || 1,
            price: price || 0
        });
        console.log(`📋 Total bookings in memory: ${tempBookings.length}`);
        
        res.json({ 
            success: true, 
            booking: newBooking, 
            booking_number: bookingNumber,
            message: 'Booking request received! We will contact you within 24 hours.'
        });
        
    } catch (error) {
        console.error('Error creating booking:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============ ADMIN ENDPOINTS ============

// Get all bookings (admin)
app.get('/api/admin/bookings', (req, res) => {
    res.json(tempBookings);
});

// Get single booking (admin)
app.get('/api/admin/bookings/:id', (req, res) => {
    const booking = tempBookings.find(b => b.id === parseInt(req.params.id));
    if (!booking) {
        return res.status(404).json({ error: 'Booking not found' });
    }
    res.json(booking);
});

// Update booking status (admin)
app.put('/api/admin/bookings/:id', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    
    const bookingIndex = tempBookings.findIndex(b => b.id === parseInt(id));
    if (bookingIndex === -1) {
        return res.status(404).json({ error: 'Booking not found' });
    }
    
    tempBookings[bookingIndex].status = status;
    console.log(`✅ Booking ${id} status updated to: ${status}`);
    
    res.json({ success: true, booking: tempBookings[bookingIndex] });
});

// Delete booking (admin)
app.delete('/api/admin/bookings/:id', (req, res) => {
    const { id } = req.params;
    const bookingIndex = tempBookings.findIndex(b => b.id === parseInt(id));
    if (bookingIndex === -1) {
        return res.status(404).json({ error: 'Booking not found' });
    }
    
    tempBookings.splice(bookingIndex, 1);
    console.log(`✅ Booking ${id} deleted`);
    
    res.json({ success: true });
});

// Get all bookings for a specific date (admin)
app.get('/api/admin/bookings/date/:date', (req, res) => {
    const { date } = req.params;
    const bookings = tempBookings.filter(b => b.appointment_date === date);
    res.json(bookings);
});

// ============ SETTINGS ENDPOINTS (ADMIN) ============

// Get all settings (admin)
app.get('/api/admin/settings', (req, res) => {
    res.json(settings);
});

// Update operating hours
app.put('/api/admin/settings/hours', (req, res) => {
    const { hours } = req.body;
    settings.operatingHours = hours;
    console.log('✅ Operating hours updated:', hours);
    res.json({ success: true, hours: settings.operatingHours });
});

// Add blocked date
app.post('/api/admin/settings/blocked-dates', (req, res) => {
    const { date, reason } = req.body;
    if (!settings.blockedDates.find(b => b.date === date)) {
        settings.blockedDates.push({ date, reason: reason || 'No reason provided' });
        console.log(`✅ Date blocked: ${date} - ${reason || 'No reason'}`);
    }
    res.json({ success: true, blockedDates: settings.blockedDates });
});

// Remove blocked date
app.delete('/api/admin/settings/blocked-dates/:date', (req, res) => {
    const { date } = req.params;
    settings.blockedDates = settings.blockedDates.filter(b => b.date !== date);
    console.log(`✅ Date unblocked: ${date}`);
    res.json({ success: true, blockedDates: settings.blockedDates });
});

// Update slot duration
app.put('/api/admin/settings/slot-duration', (req, res) => {
    const { duration } = req.body;
    settings.slotDuration = duration;
    console.log(`✅ Slot duration updated: ${duration} minutes`);
    res.json({ success: true, slotDuration: settings.slotDuration });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Brow Queen backend running on port ${PORT}`);
    console.log(`📋 Mode: In-Memory Storage`);
    console.log(`📍 API URL: http://localhost:${PORT}`);
    console.log(`\n📝 Endpoints:`);
    console.log(`   GET  /api/health`);
    console.log(`   GET  /api/services`);
    console.log(`   GET  /api/settings`);
    console.log(`   GET  /api/available-slots/:date`);
    console.log(`   POST /api/bookings`);
    console.log(`   GET  /api/admin/bookings`);
    console.log(`   PUT  /api/admin/bookings/:id`);
    console.log(`   GET  /api/admin/settings`);
    console.log(`   PUT  /api/admin/settings/hours`);
    console.log(`   POST /api/admin/settings/blocked-dates`);
    console.log(`   DELETE /api/admin/settings/blocked-dates/:date`);
    console.log(`   PUT  /api/admin/settings/slot-duration`);
});