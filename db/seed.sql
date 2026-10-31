-- Órbita · datos iniciales (se aplica solo si la tabla spaces está vacía)
insert into spaces (slug, group_name, group_pos, position, emoji, name, kind, admin_only_post) values
 ('push-start','Aquí comienza tu experiencia',1,1,'🚩','¡Push start!','posts',true),
 ('hablemos','Aquí comienza tu experiencia',1,2,'🗣️','Hablemos','posts',false),
 ('avisos','Aquí comienza tu experiencia',1,3,'🆘','Avisos','posts',true),
 ('faq','Aquí comienza tu experiencia',1,4,'❓','Preguntas Frecuentes','posts',true),
 ('ayuda','Aquí comienza tu experiencia',1,5,'💬','Centro de Ayuda','posts',false),
 ('curso-ia','Cursos Órbita',2,1,'🔒','Curso Producto con IA','locked',false),
 ('curso-15','Cursos Órbita',2,2,'⚡','Curso Órbita (Edición 15)','course',false),
 ('ai','Discusiones',3,1,'🤖','AI','posts',false),
 ('generales','Discusiones',3,2,'🗨️','Discusiones Generales y Preguntas','posts',false),
 ('recomendaciones','Discusiones',3,3,'🤜','Recomendaciones','posts',false),
 ('promote','Discusiones',3,4,'✨','Promote Your Stuff','posts',false),
 ('gracias','Discusiones',3,5,'🙏','Agradecimientos','posts',false),
 ('anonima','Discusiones',3,6,'🤫','Realiza tu Pregunta Anónima','anon',false),
 ('contratando','Empleo',4,1,'💼','Estoy contratando','posts',false),
 ('buscando','Empleo',4,2,'🔎','Estoy buscando','posts',false),
 ('encuentros','Eventos',5,1,'🎫','Encuentros','events',false),
 ('mentorias','Mentorías',6,1,'🎓','Mentorías','posts',false),
 ('webinar','Librería',7,1,'📹','Grabación Último Webinar','posts',true),
 ('otros-webinar','Librería',7,2,'📽️','Otros Webinar & Más','posts',true),
 ('templates','Librería',7,3,'📃','Templates','posts',true),
 ('mentor','Links',8,1,'↗','Accede a mentor','link',false),
 ('blog','Links',8,2,'↗','Órbita Blog','link',false),
 ('android','Links',8,3,'↗','Descargar app para Android','link',false),
 ('ios','Links',8,4,'↗','Descargar app para iOS','link',false);

-- Miembros de ejemplo (sin contraseña: no pueden iniciar sesión)
insert into users (email, name, initials, color, role, industry, bio) values
 ('ana@demo.orbita','Ana Ruiz','AR','#16794c','admin','Educación','Coordina la comunidad y las cohortes.'),
 ('dan@demo.orbita','Daniel Paredes','DP','#a8650f','member','Marketing de performance','Agencia de performance en Bogotá.'),
 ('val@demo.orbita','Valeria Ortiz','VO','#7a3fb8','member','E-commerce','Adquisición de apps.'),
 ('mar@demo.orbita','Marcos Rangel','MR','#c2410c','member','Ventas B2B',null),
 ('luc@demo.orbita','Lucía Marrero','LM','#0e7490','member','Fintech','Pagos en República Dominicana.')
on conflict (email) do nothing;

create temporary table seed_posts (k int, space text, author text, days int, title text, body text, video text);
insert into seed_posts values
 (1,'hablemos','dan',8,'¡Hola comunidad! Soy Daniel, de una agencia de performance en Bogotá', E'Desde hace seis años ayudo a negocios a crecer con inversión en Meta, Google, TikTok y LinkedIn Ads.\n\n¿Qué espero de la comunidad? Rodearme de gente que piense en sistemas de crecimiento y no solo en campañas, compartir lo que me ha funcionado y aprender de otros mercados de la región.', null),
 (2,'contratando','mar',10,'¿Alguien trabajando con closers y setters actualmente?','Estoy evaluando volver a incorporar closers y setters a mi operación comercial. Hoy tengo muchos procesos optimizados con IA, pero me gusta contar con un equipo que explore oportunidades y reactive prospectos. ¿Cómo los están remunerando y qué herramientas usan?', null),
 (3,'generales','mar',10,'Fin de curso generación XV','Una consulta: ¿hasta cuándo tendremos acceso al contenido los participantes de la generación 15? No he logrado avanzar tanto como quería y quiero organizarme para completar el entrenamiento.', null),
 (4,'hablemos','luc',14,'¿Alguien trabajando en adquirencia? Hablemos de estrategias para comercios','Trabajo en una fintech en República Dominicana. Logramos buena adopción de nuestros puntos de venta, pero el uso recurrente de los comercios cae al tercer mes. Me encantaría intercambiar experiencias de activación y retención en pagos.', null),
 (5,'webinar','ana',14,'Webinar: Growth por etapas, lo que la IA cambia y lo que no', E'Recorremos las tres etapas de crecimiento de una empresa: de 0 a 1, el escalamiento y la madurez, y qué decisiones cambian con la IA en cada una.\n\nLa grabación completa ya está disponible en este post.', '1:32:10'),
 (6,'generales','val',19,'Loyalty','Equipo, ¿recomendaciones de aplicaciones o herramientas de fidelización para clientes, del estilo de las que usan las grandes cadenas de café?', null),
 (7,'webinar','ana',20,'Webinar: Growth Analytics con IA, de los datos al diagnóstico','Tienes datos de campañas, CRM, web y ventas, pero cuesta ver qué frena el crecimiento. En esta sesión mostramos cómo conectar esas señales con IA para encontrar el cuello de botella real y convertir el diagnóstico en un plan.', '1:18:45'),
 (8,'generales','val',26,'Atribución de paid en campañas de app con MMPs','Lidero la adquisición de una app de e-commerce y la relación LTV:CAC es clave para decidir cuándo escalar, pero el ecosistema de apps no nos da visibilidad suficiente. ¿Qué están usando?', null),
 (9,'avisos','ana',30,'Calendario de sesiones en vivo de noviembre','Todas las sesiones son a las 7:00 p. m. hora de Caracas. Confirma tu asistencia en Encuentros para recibir el recordatorio.', null),
 (10,'push-start','ana',60,'Empieza aquí: cómo sacarle provecho a la comunidad', E'1. Preséntate en Hablemos.\n2. Completa tu perfil.\n3. Arranca la primera lección del curso.\n4. Confirma tu asistencia al próximo encuentro.', null),
 (11,'templates','ana',35,'Plantilla de modelo de growth cuantitativo','Hoja con las fórmulas del loop de adquisición, supuestos de conversión y proyección a 12 meses. Duplícala y adáptala a tu negocio.', null);

insert into posts (space_id, author_id, title, body, video_duration, created_at)
select s.id, u.id, p.title, p.body, p.video, now() - make_interval(days => p.days)
from seed_posts p join spaces s on s.slug = p.space join users u on u.email = p.author || '@demo.orbita'
order by p.k;

insert into comments (post_id, author_id, body, created_at)
select po.id, u.id, c.body, po.created_at + interval '3 hours'
from (values
  ('¿Alguien trabajando con closers y setters actualmente?','luc','Nosotros pagamos fijo bajo más comisión por reunión calificada. Funciona mejor que solo comisión.'),
  ('Fin de curso generación XV','ana','El acceso de la Edición 15 se mantiene hasta el 15 de marzo de 2027. Te escribo por mensaje con los detalles.')
) c(title, author, body)
join posts po on po.title = c.title join users u on u.email = c.author || '@demo.orbita';

-- Likes de ejemplo repartidos entre los miembros demo
insert into likes (user_id, post_id)
select u.id, p.id from posts p cross join users u
where u.email like '%@demo.orbita' and (p.id + length(u.email)) % 3 <> 0
on conflict do nothing;

-- Curso
insert into courses (slug, space_id, title, emoji, locked, access_ends)
select 'curso-15', id, 'Curso Órbita (Edición 15)', '⚡', false, date '2027-03-15' from spaces where slug = 'curso-15';
insert into courses (slug, space_id, title, emoji, locked)
select 'curso-ia', id, 'Curso Producto con IA', '🔒', true from spaces where slug = 'curso-ia';

create temporary table seed_lessons (sp int, section text, lp int, title text, dur text);
insert into seed_lessons values
 (1,'Inicio + bienvenida',1,'Bienvenida','03:05'),(1,'Inicio + bienvenida',2,'Obtener el máximo del curso','01:37'),
 (2,'Growth es todo',1,'¿Por qué growth es importante?','12:14'),(2,'Growth es todo',2,'Los tiempos cambiaron','07:37'),(2,'Growth es todo',3,'Un sistema sostenible y repetible','02:42'),(2,'Growth es todo',4,'Sesión en vivo, semana 1','39:31'),
 (3,'Retención + engagement',1,'La retención separa a los mejores','02:58'),(3,'Retención + engagement',2,'La retención potencia la adquisición','07:53'),(3,'Retención + engagement',3,'Definir tu métrica','07:30'),(3,'Retención + engagement',4,'Evaluando cohortes','06:03'),(3,'Retención + engagement',5,'Curvas de retención','04:23'),(3,'Retención + engagement',6,'Momento ahá','07:52'),
 (4,'Adquisición',1,'Sistemas, no silos','09:24'),(4,'Adquisición',2,'Loops, no funnels','07:02'),(4,'Adquisición',3,'Midiendo los loops','06:49'),(4,'Adquisición',4,'Loop pago','06:00'),
 (5,'Monetización',1,'La pirámide de monetización','06:59'),(5,'Monetización',2,'El framework de 4 fits','05:04'),(5,'Monetización',3,'Análisis de precio','07:02'),
 (6,'Modelos de growth',1,'El proceso de growth','03:57'),(6,'Modelos de growth',2,'Modelo cualitativo','02:12'),(6,'Modelos de growth',3,'Modelo cuantitativo','02:39');

insert into sections (course_id, title, position)
select distinct c.id, l.section, l.sp from seed_lessons l, courses c where c.slug = 'curso-15';
insert into lessons (section_id, title, position, duration)
select s.id, l.title, l.lp, l.dur from seed_lessons l
join sections s on s.title = l.section join courses c on c.id = s.course_id and c.slug = 'curso-15';

-- Eventos (fechas relativas al momento de la carga)
insert into events (title, kind, starts_at, base_going) values
 ('Modelos de growth en fintech','Webinar en vivo', date_trunc('day', now()) + interval '6 days 23 hours', 84),
 ('Clínica de pricing','Taller en vivo', date_trunc('day', now()) + interval '13 days 22 hours 30 minutes', 41),
 ('Networking de cierre de cohorte','Encuentro virtual', date_trunc('day', now()) + interval '27 days 23 hours', 63);

-- Puntos históricos de los miembros demo (para el leaderboard)
insert into points_ledger (user_id, action, points, created_at)
select u.id, 'historico', v.pts, now() - make_interval(days => v.d)
from (values
  ('ana',46,2),('ana',142,15),('ana',1232,200),
  ('val',74,20),('val',438,200),
  ('dan',9,3),('dan',31,20),('dan',300,200),
  ('luc',22,4),('luc',39,20),('luc',229,200),
  ('mar',14,5),('mar',19,20),('mar',172,200)
) v(who, pts, d) join users u on u.email = v.who || '@demo.orbita';
