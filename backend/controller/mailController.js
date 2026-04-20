import nodemailer from "nodemailer";

export const sendMail = async (req, res) => {
    console.log("📨 Controller exécuté");
    console.log("BODY:", req.body);
    try {
        const { name, email, subject, message } = req.body;

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: "eventplanner315@gmail.com",
                pass: "glsc ataw icdj ldws",
            }
        });

        const mailOptions = {
            from: email,
            to: "eventplanner315@gmail.com",
            subject: subject,
            html: `
        <h3>Nouveau message</h3>
        <p><b>Nom:</b> ${name}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Message:</b><br/> ${message}</p>
      `
        };

        await transporter.sendMail(mailOptions);
        console.log("ok");

        res.status(200).json({ message: "Email envoyé avec succès" });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};