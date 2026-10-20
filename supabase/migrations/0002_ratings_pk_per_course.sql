-- Question ids are only unique within a course (Q-D1-007 exists in both banks),
-- so a rating must be keyed by course as well.
alter table ratings drop constraint ratings_pkey;
alter table ratings add primary key (user_id, course, qid);
