from pathlib import Path
import unicodedata


def _config_value(config, key, fallback=''):
    value = config.get(key, fallback)
    return str(value).strip() if value is not None else fallback


def _pdf_safe(value):
    text = unicodedata.normalize('NFKD', str(value or ''))
    return text.encode('ascii', 'ignore').decode('ascii')


def _contact_line(label, value):
    return f'{label} {value}' if value else ''


def build_onboarding_email(user, config):
    client_name = str(user.name or 'there').strip() or 'there'
    lead_name = _config_value(config, 'ONBOARDING_LEAD_NAME', 'AutoConcierge Operations Team')
    lead_phone = _config_value(config, 'ONBOARDING_LEAD_PHONE', 'Please reply to this email')
    lead_email = _config_value(
        config,
        'ONBOARDING_LEAD_EMAIL',
        config.get('MAIL_DEFAULT_SENDER') or config.get('MAIL_USERNAME') or 'AutoConcierge Support',
    )
    lead_whatsapp = _config_value(config, 'ONBOARDING_LEAD_WHATSAPP', '')

    signatory_name = _config_value(config, 'ONBOARDING_SIGNATORY_NAME', 'AutoConcierge Team')
    signatory_title = _config_value(config, 'ONBOARDING_SIGNATORY_TITLE', 'Concierge Operations')
    signatory_phone = _config_value(config, 'ONBOARDING_SIGNATORY_PHONE', lead_phone)
    signatory_email = _config_value(config, 'ONBOARDING_SIGNATORY_EMAIL', lead_email)
    website = _config_value(config, 'ONBOARDING_WEBSITE', '')

    contact_lines = [
        _contact_line('📞', lead_phone),
        _contact_line('📧', lead_email),
        _contact_line('💬', lead_whatsapp),
    ]
    contact_block = '\n'.join(line for line in contact_lines if line)

    signoff_lines = [
        signatory_name,
        signatory_title,
        'AutoConcierge',
        _contact_line('📞', signatory_phone),
        _contact_line('📧', signatory_email),
        _contact_line('🌐', website),
    ]
    signoff = '\n'.join(line for line in signoff_lines if line)

    subject = 'Welcome to AutoConcierge — Your Welcome Pack'
    body = f"""Dear {client_name},

Welcome to AutoConcierge — we’re delighted to have you with us.

Our role is to make your experience as seamless, responsive, and effortless as possible. From day-to-day requests to urgent assistance, our team is here to help coordinate the details so you can focus on what matters most.

Your Dedicated Concierge Operations Lead
Your dedicated point of contact is:


{lead_name}
Concierge Operations Lead
{contact_block}

They will be your primary contact for concierge requests, coordination, and ongoing support. If you’re ever unsure who to contact, you can reach out to them directly and they’ll guide you to the right team.

Your Welcome Pack
Attached to this email is your AutoConcierge Welcome Pack, which contains the key information you may need during your time with us, including:

Your Concierge Operations Lead’s contact details

AutoConcierge operating hours

Emergency and after-hours contact numbers

How to reach our team

What to do in an urgent situation

Additional information to help you get the most from your AutoConcierge service

We recommend keeping the Welcome Pack somewhere easily accessible on your phone.

We’re Here to Help
Whether you need assistance with an everyday request, require coordination with one of our service partners, or simply aren't sure who to contact, please don't hesitate to reach out.

Thank you for choosing AutoConcierge. We look forward to taking care of the details and delivering a smooth, dependable experience from day one.

Warm regards,

{signoff}"""
    return subject, body


def _add_section(pdf, heading, lines):
    pdf.set_x(pdf.l_margin)
    pdf.set_font('Helvetica', 'B', 11)
    pdf.set_text_color(6, 78, 59)
    pdf.multi_cell(0, 6, _pdf_safe(heading))
    pdf.set_x(pdf.l_margin)
    pdf.ln(1)
    pdf.set_x(pdf.l_margin)
    pdf.set_font('Helvetica', '', 9)
    pdf.set_text_color(35, 35, 35)
    for line in lines:
        safe_line = _pdf_safe(line)
        if safe_line:
            pdf.set_x(pdf.l_margin)
            pdf.multi_cell(0, 5, safe_line)
            pdf.set_x(pdf.l_margin)
    pdf.ln(2)
    pdf.set_x(pdf.l_margin)


def generate_welcome_pack_pdf(user, config, output_path):
    from fpdf import FPDF

    client_name = str(user.name or 'there').strip() or 'there'
    lead_name = _config_value(config, 'ONBOARDING_LEAD_NAME', 'AutoConcierge Operations Team')
    lead_phone = _config_value(config, 'ONBOARDING_LEAD_PHONE', 'Please reply to this email')
    lead_email = _config_value(
        config,
        'ONBOARDING_LEAD_EMAIL',
        config.get('MAIL_DEFAULT_SENDER') or config.get('MAIL_USERNAME') or 'AutoConcierge Support',
    )
    lead_whatsapp = _config_value(config, 'ONBOARDING_LEAD_WHATSAPP', '')
    operating_hours = _config_value(
        config,
        'ONBOARDING_OPERATING_HOURS',
        'Please contact your dedicated concierge lead for current operating hours.',
    )
    emergency_contact = _config_value(
        config,
        'ONBOARDING_EMERGENCY_CONTACT',
        'Contact your dedicated concierge lead or reply to this email for urgent assistance.',
    )
    website = _config_value(config, 'ONBOARDING_WEBSITE', '')

    pdf = FPDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.set_fill_color(6, 78, 59)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font('Helvetica', 'B', 18)
    pdf.cell(0, 14, 'AutoConcierge', align='C', fill=True)
    pdf.ln(20)
    pdf.set_x(pdf.l_margin)

    pdf.set_text_color(6, 78, 59)
    pdf.set_font('Helvetica', 'B', 15)
    pdf.multi_cell(0, 8, 'Welcome Pack')
    pdf.set_x(pdf.l_margin)
    pdf.set_font('Helvetica', '', 10)
    pdf.set_text_color(55, 55, 55)
    pdf.multi_cell(0, 6, f'Prepared for {_pdf_safe(client_name)}')
    pdf.ln(4)

    _add_section(pdf, 'Your Dedicated Concierge Operations Lead', [
        lead_name,
        'Concierge Operations Lead',
        _contact_line('Phone:', lead_phone),
        _contact_line('Email:', lead_email),
        _contact_line('WhatsApp:', lead_whatsapp),
    ])
    _add_section(pdf, 'Operating Hours', [operating_hours])
    _add_section(pdf, 'Emergency and After-Hours Contact', [emergency_contact])
    _add_section(pdf, 'How to Reach Our Team', [
        'Start with your dedicated Concierge Operations Lead using the contact details above.',
        'If you are unsure who to contact, reply to this email or call the number listed for your lead.',
        f'Website: {website}' if website else '',
    ])
    _add_section(pdf, 'What to Do in an Urgent Situation', [
        'Contact your dedicated Concierge Operations Lead immediately.',
        'If there is an immediate risk to life or property, contact the appropriate local emergency service first.',
        'Keep your vehicle, location, and request details available so the team can coordinate a fast response.',
    ])
    _add_section(pdf, 'Getting the Most from AutoConcierge', [
        'Send requests with as much detail as possible, including dates, locations, vehicle details, and preferred outcomes.',
        'Keep this pack accessible on your phone for contact details and urgent instructions.',
        'Our team will coordinate the details and keep you informed throughout the request.',
    ])

    pdf.set_draw_color(210, 210, 210)
    pdf.line(10, pdf.get_y() + 3, 200, pdf.get_y() + 3)
    pdf.set_y(pdf.get_y() + 7)
    pdf.set_font('Helvetica', '', 8)
    pdf.set_text_color(90, 90, 90)
    pdf.multi_cell(0, 4, 'AutoConcierge | Seamless, responsive, and effortless vehicle care coordination')

    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)
    pdf.output(str(output))
    return str(output)


def resolve_welcome_pack(config, user_id):
    configured_path = _config_value(config, 'WELCOME_PACK_PATH', '')
    if configured_path:
        configured = Path(configured_path)
        if configured.is_file():
            return configured, False
        configured.parent.mkdir(parents=True, exist_ok=True)
        return configured, True

    directory = Path(_config_value(config, 'WELCOME_PACK_DIR', '/app/uploads/onboarding'))
    filename = _config_value(config, 'WELCOME_PACK_FILENAME') or f'AutoConcierge-Welcome-Pack-{user_id}.pdf'
    return directory / filename, True
